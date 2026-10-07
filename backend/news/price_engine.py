"""
Price simulation engine (project brief section 3). A single simulated
crude price, seeded from a real-ish recent Brent value and ALWAYS treated
as a simulation -- never fetched live, never presented as a real-time
quote. Persisted in SQLite (db.py) so it survives restarts.

apply_event() is the one entry point everything else calls: poller.py
after a real classification, main.py's test-inject endpoint for manual
testing. Testable in isolation from news-fetching/classification, per the
brief's explicit interface requirement (applyEvent(event) -> newState).

Severity sign convention (shared with classifier_claude.py and
classifier_rules.py): positive = bullish for crude price (supply
tightens), negative = bearish (supply eases). For EV_LITHIUM_SUPPLY
events specifically, the SAME sign convention is reused but applied to
lithium SUPPLY TIGHTNESS instead of crude price -- positive severity
(tightening) pushes lithium_supply_index DOWN (worse availability),
negative (easing, e.g. a new mine) pushes it UP. This mirrors the brief's
"analogous but separate adjustment ... keep the two data stories
independent" instruction: an EV/lithium event never touches
crude_price_usd, and a crude event never touches lithium_supply_index.
"""

import logging
from datetime import datetime, timezone

from . import db, sse
from .models import Article, ClassifiedEvent, EventType

logger = logging.getLogger("news_pipeline")

# A real-ish recent Brent crude price, used ONLY to seed the simulation.
# Never re-fetched, never a live quote -- see the "SIMULATED" tag on every
# log line and API field this flows into.
SEED_PRICE_USD = 82.50

# Tunable, per the brief: sized so a single article moves price roughly
# 1-3% at max severity (1.0) * confidence (1.0). Start here, retune by
# observing real price_events, not by guessing further.
IMPACT_WEIGHT = 0.02

# Fraction of the gap back to the rolling baseline closed per hour of
# elapsed time with no new events (an Ornstein-Uhlenbeck-style pull, per
# the brief). Deliberately slow -- this is a background drift, not meant
# to dominate a single apply_event() call made seconds after the last one.
REVERSION_RATE_PER_HOUR = 0.05

MIN_PRICE_USD = 20.0
MAX_PRICE_USD = 250.0

LITHIUM_IMPACT_WEIGHT = 0.04
MIN_LITHIUM_INDEX = 0.3
MAX_LITHIUM_INDEX = 3.0
SEED_LITHIUM_SUPPLY_INDEX = 1.0  # 1.0 = baseline; >1 easier supply, <1 tighter

# Independent second check, duplicating classifier_claude.MIN_CONFIDENCE_
# FOR_PRICE_IMPACT -- apply_event() can in principle be called directly
# (tests, future callers) without going through a classifier that already
# enforces this, so the price engine enforces its own floor too.
MIN_CONFIDENCE_FOR_PRICE_IMPACT = 0.5


def get_state() -> dict:
    """Public accessor -- current simulated price/lithium-index state,
    seeding it first if this is the very first call since the DB was
    created."""
    return _ensure_seeded()


def _ensure_seeded() -> dict:
    state = db.get_price_state()
    if state is None:
        db.set_price_state(SEED_PRICE_USD, SEED_PRICE_USD, SEED_LITHIUM_SUPPLY_INDEX)
        state = db.get_price_state()
        logger.info(
            "Price engine seeded: crude=$%.2f (SIMULATED SEED, not a live quote), lithium_supply_index=%.2f",
            SEED_PRICE_USD,
            SEED_LITHIUM_SUPPLY_INDEX,
        )
    return state


def _hours_since(iso_timestamp: str) -> float:
    last = datetime.fromisoformat(iso_timestamp)
    return max(0.0, (datetime.now(timezone.utc) - last).total_seconds() / 3600.0)


def _reverted(value: float, baseline: float, hours_elapsed: float) -> float:
    fraction = min(1.0, REVERSION_RATE_PER_HOUR * hours_elapsed)
    return value + (baseline - value) * fraction


def apply_event(article: Article, event: ClassifiedEvent, classifier_used: str) -> dict:
    """Applies one classified event to the simulated price / lithium-index
    state and persists the result. No-ops (but still logs why, and still
    returns the unchanged state) when the event isn't price-relevant or
    confidence is too low -- callers don't need to pre-filter."""
    state = _ensure_seeded()

    if not event.price_relevant:
        logger.info("Price engine: '%s' not price_relevant -- no price impact.", article.title)
        return state

    if event.confidence < MIN_CONFIDENCE_FOR_PRICE_IMPACT:
        logger.info(
            "Price engine: '%s' confidence %.2f below %.2f threshold -- no price impact.",
            article.title,
            event.confidence,
            MIN_CONFIDENCE_FOR_PRICE_IMPACT,
        )
        return state

    hours_elapsed = _hours_since(state["last_updated_at"])

    if event.event_type == EventType.EV_LITHIUM_SUPPLY:
        index_before = state["lithium_supply_index"]
        reverted = _reverted(index_before, SEED_LITHIUM_SUPPLY_INDEX, hours_elapsed)
        new_index = reverted * (1 - event.severity * event.confidence * LITHIUM_IMPACT_WEIGHT)
        new_index = max(MIN_LITHIUM_INDEX, min(MAX_LITHIUM_INDEX, new_index))

        db.set_price_state(state["crude_price_usd"], state["rolling_baseline_usd"], new_index)
        alert = db.record_price_event(
            article,
            event,
            classifier_used,
            price_before=None,
            price_after=None,
            lithium_index_before=index_before,
            lithium_index_after=new_index,
        )
        new_state = db.get_price_state()
        sse.broadcast("price_event", {"alert": alert, "price_state": new_state})
        logger.info(
            "[%s] SIMULATED lithium supply index: %.3f -> %.3f (severity=%+.2f conf=%.2f) :: %s",
            classifier_used,
            index_before,
            new_index,
            event.severity,
            event.confidence,
            event.summary,
        )
        return new_state

    price_before = state["crude_price_usd"]
    reverted_price = _reverted(price_before, state["rolling_baseline_usd"], hours_elapsed)
    new_price = reverted_price * (1 + event.severity * event.confidence * IMPACT_WEIGHT)
    new_price = max(MIN_PRICE_USD, min(MAX_PRICE_USD, new_price))

    db.set_price_state(new_price, state["rolling_baseline_usd"], state["lithium_supply_index"])
    alert = db.record_price_event(
        article,
        event,
        classifier_used,
        price_before=price_before,
        price_after=new_price,
        lithium_index_before=None,
        lithium_index_after=None,
    )
    new_state = db.get_price_state()
    sse.broadcast("price_event", {"alert": alert, "price_state": new_state})

    pct_change = (new_price - price_before) / price_before * 100
    logger.info(
        "[%s] SIMULATED crude price: $%.2f -> $%.2f (%+.2f%%) via severity=%+.2f conf=%.2f [%s, chokepoints=%s] :: %s",
        classifier_used,
        price_before,
        new_price,
        pct_change,
        event.severity,
        event.confidence,
        event.event_type.value,
        event.affected_entities.chokepoints or "-",
        event.summary,
    )
    return new_state


def apply_reversion_only() -> dict:
    """Advances mean reversion with no new event. Used by tests (and
    available for a future periodic background tick) to verify the price
    actually drifts back toward baseline over elapsed time with no new
    events -- the brief's explicit Stage 5 verification requirement."""
    state = _ensure_seeded()
    hours_elapsed = _hours_since(state["last_updated_at"])
    new_price = _reverted(state["crude_price_usd"], state["rolling_baseline_usd"], hours_elapsed)
    new_index = _reverted(state["lithium_supply_index"], SEED_LITHIUM_SUPPLY_INDEX, hours_elapsed)
    db.set_price_state(new_price, state["rolling_baseline_usd"], new_index)
    return db.get_price_state()
