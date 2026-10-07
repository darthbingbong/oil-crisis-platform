"""
Rule-based fallback classifier -- produces the exact same ClassifiedEvent
shape as the Claude-based classifier (classifier_claude.py), so every
downstream stage (price engine, alert feed, historical chart) works
identically regardless of which one actually ran. Selected automatically
by classify.py whenever ANTHROPIC_API_KEY isn't configured.

A blunt keyword heuristic, not a substitute for real language
understanding -- confidence is deliberately capped well below what the
Claude classifier would produce (see classifier_claude.MIN_CONFIDENCE_FOR_
PRICE_IMPACT = 0.5; this caps at 0.55) so the price engine always weighs a
rule-based read lightly relative to a real one.

Severity sign convention matches the schema exactly as originally
specified (see models.py / classifier_claude.py's SYSTEM_PROMPT): positive
= bullish for crude price (supply tightens -- an attack, a halt, an
escalation), negative = bearish (supply eases -- a resumption, a
de-escalation). A tanker attack must push price UP, not down, for the
price engine's math to make sense -- this is a correctness requirement
anchored to classifier_claude.py's calibration, not a style preference.
"""

import logging

from .models import AffectedEntities, Article, ClassifiedEvent, EventType

logger = logging.getLogger("news_pipeline")

MAX_CONFIDENCE = 0.55
BASE_CONFIDENCE = 0.45

# Checked against "title + description", lowercased. First category whose
# keyword list matches wins -- ordered roughly most-specific-first so e.g.
# a chokepoint tanker attack doesn't fall through to the generic
# "conflict_escalation" bucket just because it also mentions a country.
EVENT_TYPE_RULES: list[tuple[EventType, list[str]]] = [
    (
        EventType.CHOKEPOINT_DISRUPTION,
        [
            "strait of hormuz",
            "bab el-mandeb",
            "bab al-mandab",
            "suez canal",
            "strait of malacca",
            "tanker attack",
            "tanker logjam",
            "shipping lane",
            "maritime attack",
        ],
    ),
    (
        EventType.SUPPLY_OUTAGE,
        [
            "refinery halt",
            "refinery fire",
            "halts operations",
            "halted operations",
            "drone strike",
            "pipeline outage",
            "production halted",
            "output halted",
        ],
    ),
    (
        EventType.OPEC_DECISION,
        ["opec", "production cut", "output cut", "production quota", "output quota"],
    ),
    (
        EventType.SANCTIONS,
        ["sanctions", "sanctioned", "embargo"],
    ),
    (
        EventType.EV_LITHIUM_SUPPLY,
        [
            "lithium supply",
            "lithium mine",
            "lithium mining",
            "lithium production",
            "lithium carbonate",
            "lithium prices",
            "lithium market",
            "lithium deposit",
            "lithium reserves",
            "ev battery",
            "battery supply chain",
        ],
    ),
    (
        EventType.CONFLICT_ESCALATION,
        ["tension", "military", "offensive", "escalation", "escalating", "war"],
    ),
]

# Severity nudges. Checked independently of the event_type rules above (a
# single article can match an event-type keyword from one list and a
# severity keyword from either list below). Positive = bullish/price-up
# (supply risk rising); negative = bearish/price-down (supply risk easing).
# Magnitude tiers roughly mirror what the brief asked for, sign-corrected
# per this module's docstring.
BULLISH_TERMS: dict[str, float] = {
    "attack": 0.75,
    "attacked": 0.75,
    "blockade": 0.85,
    "drone strike": 0.75,
    "halted": 0.6,
    "halts": 0.6,
    "halt": 0.55,
    "shut down": 0.6,
    "shuts down": 0.6,
    "escalation": 0.6,
    "escalating": 0.6,
    "war": 0.65,
    "strike on": 0.6,
    "outage": 0.6,
    "fire": 0.55,
    "tension": 0.35,
    "sanctions": 0.5,
    "production cut": 0.45,
    "output cut": 0.45,
}

BEARISH_TERMS: dict[str, float] = {
    "resumes": -0.45,
    "resume": -0.45,
    "resumed": -0.45,
    "eases": -0.4,
    "easing": -0.4,
    "eased": -0.4,
    "agreement": -0.35,
    "deal reached": -0.45,
    "recovers": -0.4,
    "recovery": -0.35,
    "reopens": -0.45,
    "reopened": -0.45,
    "resolved": -0.4,
    "normal": -0.25,
}

_SEVERITY_TERMS: dict[str, float] = {**BULLISH_TERMS, **BEARISH_TERMS}

# Reused for affected_entities.chokepoints / .countries extraction --
# canonical display name -> the substrings (lowercased) that imply it.
_CHOKEPOINT_ALIASES: dict[str, list[str]] = {
    "Hormuz": ["strait of hormuz", "hormuz"],
    "Bab el-Mandeb": ["bab el-mandeb", "bab al-mandab"],
    "Suez": ["suez canal", "suez"],
    "Malacca": ["strait of malacca", "malacca"],
}

_COUNTRY_ALIASES: dict[str, list[str]] = {
    "Saudi Arabia": ["saudi arabia"],
    "Iran": ["iran"],
    "Iraq": ["iraq"],
    "United Arab Emirates": ["united arab emirates", "uae"],
    "Kuwait": ["kuwait"],
    "Russia": ["russia"],
    "Venezuela": ["venezuela"],
    "Nigeria": ["nigeria"],
    "Libya": ["libya"],
    "Qatar": ["qatar"],
    "Oman": ["oman"],
    "Yemen": ["yemen"],
}


def _extract_entities(text: str) -> AffectedEntities:
    chokepoints = [name for name, aliases in _CHOKEPOINT_ALIASES.items() if any(a in text for a in aliases)]
    countries = [name for name, aliases in _COUNTRY_ALIASES.items() if any(a in text for a in aliases)]
    return AffectedEntities(chokepoints=chokepoints, countries=countries, companies=[])


def _score_severity(text: str) -> tuple[float, str | None]:
    """Strongest single match wins (by magnitude), not a sum -- a headline
    that happens to contain several matched words shouldn't auto-clamp to
    +-1.0 just from term-count. Returns (severity, matched_term)."""
    best_term: str | None = None
    best_weight = 0.0
    for term, weight in _SEVERITY_TERMS.items():
        if term in text and abs(weight) > abs(best_weight):
            best_weight = weight
            best_term = term
    return max(-1.0, min(1.0, best_weight)), best_term


def _classify_event_type(text: str) -> tuple[EventType, str | None]:
    for event_type, keywords in EVENT_TYPE_RULES:
        for kw in keywords:
            if kw in text:
                return event_type, kw
    return EventType.OTHER, None


def classify_article(article: Article) -> ClassifiedEvent:
    text = f"{article.title} {article.description}".lower()

    event_type, type_keyword = _classify_event_type(text)
    severity, severity_keyword = _score_severity(text)
    entities = _extract_entities(text)

    price_relevant = event_type != EventType.OTHER

    confidence = BASE_CONFIDENCE
    if type_keyword and severity_keyword:
        confidence = MAX_CONFIDENCE  # both an event-type and a direction signal matched
    confidence = max(0.0, min(MAX_CONFIDENCE, confidence))

    matched_on = type_keyword or severity_keyword or "no keyword match"
    summary = f"[heuristic match: '{matched_on}'] {article.title}"

    event = ClassifiedEvent(
        event_type=event_type,
        affected_entities=entities,
        severity=severity,
        confidence=confidence,
        summary=summary,
        price_relevant=price_relevant,
    )

    logger.info(
        "[classifier=rules] [%s] conf=%.2f sev=%+.2f price_relevant=%s (matched '%s') :: %s",
        event.event_type.value,
        event.confidence,
        event.severity,
        event.price_relevant,
        matched_on,
        article.title,
    )
    return event
