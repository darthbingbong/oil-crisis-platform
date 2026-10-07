"""
Data shapes for the news ingestion/classification pipeline.

ClassifiedEvent is the exact schema specified in the project brief -- used
directly as the Pydantic `output_format` for Claude's structured-output
call (see classifier.py), so what the model returns IS this type, not
something hand-parsed out of free text afterward.
"""

from dataclasses import dataclass
from enum import Enum

from pydantic import BaseModel, Field


@dataclass
class Article:
    """A candidate news article, from a real provider or a fixture."""

    title: str
    description: str
    url: str
    source: str
    published_at: str  # provider's own raw timestamp format, kept as-is


class EventType(str, Enum):
    CHOKEPOINT_DISRUPTION = "chokepoint_disruption"
    OPEC_DECISION = "opec_decision"
    SANCTIONS = "sanctions"
    CONFLICT_ESCALATION = "conflict_escalation"
    SUPPLY_OUTAGE = "supply_outage"
    EV_LITHIUM_SUPPLY = "ev_lithium_supply"
    DEMAND_SHOCK = "demand_shock"
    OTHER = "other"


class AffectedEntities(BaseModel):
    chokepoints: list[str] = Field(default_factory=list)
    countries: list[str] = Field(default_factory=list)
    companies: list[str] = Field(default_factory=list)


class ClassifiedEvent(BaseModel):
    """
    What Claude extracts from one article. This IS the output_format passed
    to client.messages.parse() -- the API guarantees the response validates
    against this shape, so there's no free-text JSON parsing to get wrong.
    """

    event_type: EventType
    affected_entities: AffectedEntities
    severity: float = Field(
        ...,
        ge=-1.0,
        le=1.0,
        description="Magnitude of impact; sign = direction. Negative = bearish for crude price, positive = bullish.",
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="How clearly the article supports this read."
    )
    summary: str = Field(..., description="One sentence, plain language.")
    price_relevant: bool = Field(
        ...,
        description="False for near-duplicate or low-signal stories; these should not trigger a price update.",
    )
