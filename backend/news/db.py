"""
SQLite store for the news pipeline. Three jobs:

1. Dedup -- don't reprocess (and re-pay for) the same article URL on every
   poll cycle.
2. Audit log -- the raw article alongside its classification (and which
   classifier produced it), so a price move can be traced back to exactly
   which article caused it.
3. Price state + price-moving event history -- the price engine's
   persisted state (price_engine.py) and the append-only log that backs
   both the live alert feed and the historical-chart union (see main.py's
   GET /api/v1/conflicts).

SQLite rather than the existing CSVs: this data is appended continuously by
a background loop while pandas holds the CSVs open read-only at startup --
concurrent writes to a CSV under pandas is fragile in a way a real (if
tiny) database isn't.
"""

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from .models import Article, ClassifiedEvent

DB_PATH = Path(__file__).parent.parent / "data" / "news_pipeline.db"


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _add_column_if_missing(conn: sqlite3.Connection, table: str, column: str, ddl_type: str) -> None:
    """ALTER TABLE ... ADD COLUMN is not idempotent in SQLite -- this makes
    init_db() safe to run against a database created by an earlier version
    of this schema (e.g. before classifier_used existed) without requiring
    anyone to manually delete the file."""
    try:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" not in str(e).lower():
            raise


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS processed_articles (
                url_hash TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT NOT NULL,
                source TEXT,
                published_at TEXT,
                processed_at TEXT NOT NULL,
                status TEXT NOT NULL,              -- 'classified' | 'skipped_not_relevant'
                event_type TEXT,
                severity REAL,
                confidence REAL,
                price_relevant INTEGER,
                summary TEXT,
                raw_classification_json TEXT,
                description TEXT
            )
            """
        )
        _add_column_if_missing(conn, "processed_articles", "classifier_used", "TEXT")

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS price_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                crude_price_usd REAL NOT NULL,
                rolling_baseline_usd REAL NOT NULL,
                lithium_supply_index REAL NOT NULL,
                last_updated_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS price_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                occurred_at TEXT NOT NULL,
                article_title TEXT NOT NULL,
                article_url TEXT NOT NULL,
                event_type TEXT NOT NULL,
                severity REAL NOT NULL,
                confidence REAL NOT NULL,
                classifier_used TEXT NOT NULL,
                price_before REAL,
                price_after REAL,
                price_pct_change REAL,
                lithium_index_before REAL,
                lithium_index_after REAL,
                chokepoints_json TEXT NOT NULL,
                countries_json TEXT NOT NULL,
                summary TEXT NOT NULL
            )
            """
        )


# ---------------------------------------------------------------------------
# Article processing / audit log
# ---------------------------------------------------------------------------
def is_processed(url_hash: str) -> bool:
    with _connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM processed_articles WHERE url_hash = ?", (url_hash,)
        ).fetchone()
        return row is not None


def record_skipped(url_hash: str, article: Article, reason: str) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO processed_articles
                (url_hash, url, title, source, published_at, processed_at, status, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                url_hash,
                article.url,
                article.title,
                article.source,
                article.published_at,
                datetime.now(timezone.utc).isoformat(),
                reason,
                article.description,
            ),
        )


def record_classification(url_hash: str, article: Article, event: ClassifiedEvent, classifier_used: str) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO processed_articles
                (url_hash, url, title, source, published_at, processed_at, status,
                 event_type, severity, confidence, price_relevant, summary,
                 raw_classification_json, description, classifier_used)
            VALUES (?, ?, ?, ?, ?, ?, 'classified', ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                url_hash,
                article.url,
                article.title,
                article.source,
                article.published_at,
                datetime.now(timezone.utc).isoformat(),
                event.event_type.value,
                event.severity,
                event.confidence,
                int(event.price_relevant),
                event.summary,
                json.dumps(event.model_dump(), default=str),
                article.description,
                classifier_used,
            ),
        )


def recent_classifications(limit: int = 50) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM processed_articles
            WHERE status = 'classified'
            ORDER BY processed_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]


# ---------------------------------------------------------------------------
# Price engine state
# ---------------------------------------------------------------------------
def get_price_state() -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM price_state WHERE id = 1").fetchone()
        return dict(row) if row else None


def set_price_state(crude_price_usd: float, rolling_baseline_usd: float, lithium_supply_index: float) -> None:
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO price_state (id, crude_price_usd, rolling_baseline_usd, lithium_supply_index, last_updated_at)
            VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                crude_price_usd = excluded.crude_price_usd,
                rolling_baseline_usd = excluded.rolling_baseline_usd,
                lithium_supply_index = excluded.lithium_supply_index,
                last_updated_at = excluded.last_updated_at
            """,
            (crude_price_usd, rolling_baseline_usd, lithium_supply_index, datetime.now(timezone.utc).isoformat()),
        )


# ---------------------------------------------------------------------------
# Price-moving event log -- backs both the live alert feed and the
# historical-chart union (main.py reshapes rows from this into the
# existing ConflictEvent shape).
# ---------------------------------------------------------------------------
def record_price_event(
    article: Article,
    event: ClassifiedEvent,
    classifier_used: str,
    price_before: float | None,
    price_after: float | None,
    lithium_index_before: float | None,
    lithium_index_after: float | None,
) -> None:
    pct_change = None
    if price_before is not None and price_after is not None and price_before != 0:
        pct_change = (price_after - price_before) / price_before * 100

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO price_events
                (occurred_at, article_title, article_url, event_type, severity, confidence,
                 classifier_used, price_before, price_after, price_pct_change,
                 lithium_index_before, lithium_index_after, chokepoints_json, countries_json, summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                article.title,
                article.url,
                event.event_type.value,
                event.severity,
                event.confidence,
                classifier_used,
                price_before,
                price_after,
                pct_change,
                lithium_index_before,
                lithium_index_after,
                json.dumps(event.affected_entities.chokepoints),
                json.dumps(event.affected_entities.countries),
                event.summary,
            ),
        )


def recent_price_events(limit: int = 50) -> list[dict]:
    """Alert-feed data: newest first."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM price_events ORDER BY occurred_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]


def crude_price_events_for_chart() -> list[dict]:
    """Only the events that actually moved the simulated crude price
    (excludes ev_lithium_supply events, which affect lithium_supply_index
    instead) -- these are reshaped into ConflictEvent rows in main.py."""
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM price_events WHERE price_pct_change IS NOT NULL ORDER BY occurred_at ASC"
        ).fetchall()
        return [dict(row) for row in rows]
