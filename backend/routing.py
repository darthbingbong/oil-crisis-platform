"""
Route-recommendation module: given a blocked/disrupted chokepoint, what
bypass routes exist, how much capacity can they actually absorb, and how
much extra transit time do they add?

Deliberately NOT machine learning. There's no historical "which route did
shippers actually choose" dataset to train on -- this is real, documented
pipeline/strait geography (Petroline, ADCOP, SUMED, the Lombok/Sunda
alternates to Malacca), the same kind of domain knowledge already encoded
in refineries.csv's nearest_chokepoint/bypass notes. Matches this project's
established pattern: formula/rule-based over ML when there isn't enough
labeled data to learn from (see PHASE1_SUMMARY.md).

KNOWN SIMPLIFICATION: bypass capacity is treated as one fungible pool per
chokepoint, not matched to which specific hub's crude it can actually
serve. In reality Petroline only carries Saudi-origin crude (helps Ras
Tanura) -- it doesn't let an import-dependent refinery like Jamnagar
(India) receive Gulf crude from OTHER producers (e.g. Iran's Kharg
Island) without still transiting Hormuz. So "uncovered_capacity_bpd == 0"
means "enough aggregate pipeline capacity exists," not "every affected
hub specifically has a working bypass." Flagged the same way
PHASE1_SUMMARY.md flags its own estimates -- a real limitation, not a bug.
"""

from dataclasses import dataclass, field

import pandas as pd

from refineries import capacity_at_risk_bpd, refineries_at_chokepoint

BYPASS_ROUTES_CSV_PATH = "data/bypass_routes.csv"


def load_bypass_routes(path: str = BYPASS_ROUTES_CSV_PATH) -> pd.DataFrame:
    return pd.read_csv(path)


def bypass_options_for_chokepoint(df: pd.DataFrame, chokepoint: str) -> pd.DataFrame:
    """All documented bypass routes for one chokepoint."""
    return df[df["chokepoint"].str.lower() == chokepoint.lower()]


def fast_bypass_capacity_bpd(df: pd.DataFrame, chokepoint: str) -> float:
    """
    Capacity (bpd) reachable via a finite-capacity, low-extra-time bypass
    (a real pipeline or an alternate strait) -- excludes the
    "sail around Africa" option, which has no capacity limit but a large
    time penalty, so it isn't a like-for-like substitute.
    """
    options = bypass_options_for_chokepoint(df, chokepoint)
    fast = options[options["route_type"] != "cape_diversion"]
    return float(fast["capacity_bpd"].sum())


def has_cape_diversion(df: pd.DataFrame, chokepoint: str) -> bool:
    options = bypass_options_for_chokepoint(df, chokepoint)
    return bool((options["route_type"] == "cape_diversion").any())


@dataclass
class BypassOption:
    via: str
    route_type: str
    capacity_bpd: float | None
    extra_transit_days: float
    notes: str


@dataclass
class RouteRecommendation:
    chokepoint: str
    capacity_at_risk_bpd: float
    affected_hubs: list[str]
    bypass_options: list[BypassOption]
    fast_bypass_capacity_bpd: float
    uncovered_capacity_bpd: float
    explanation: str = field(default="")


def recommend_reroute(
    refineries_df: pd.DataFrame,
    routes_df: pd.DataFrame,
    chokepoint: str,
) -> RouteRecommendation:
    """
    Combine chokepoint capacity-at-risk (refineries.py) with the documented
    bypass routes (bypass_routes.csv) to answer: if this chokepoint were
    blocked, how much of the affected capacity has a fast (pipeline/strait)
    bypass, how much is left with only the slow Cape-of-Good-Hope option
    (or no bypass at all), and what does that mean in plain terms.
    """
    at_risk = capacity_at_risk_bpd(refineries_df, chokepoint)
    affected_hubs = list(refineries_at_chokepoint(refineries_df, chokepoint)["name"])

    options_df = bypass_options_for_chokepoint(routes_df, chokepoint)
    options = [
        BypassOption(
            via=row["via"],
            route_type=row["route_type"],
            capacity_bpd=None if pd.isna(row["capacity_bpd"]) else float(row["capacity_bpd"]),
            extra_transit_days=float(row["extra_transit_days"]),
            notes=row["notes"],
        )
        for _, row in options_df.iterrows()
    ]

    fast_capacity = fast_bypass_capacity_bpd(routes_df, chokepoint)
    uncovered = max(0.0, at_risk - fast_capacity)
    cape_available = has_cape_diversion(routes_df, chokepoint)

    if at_risk == 0:
        explanation = f"No tracked refinery/export capacity depends on {chokepoint}."
    elif not options:
        explanation = (
            f"{at_risk:,.0f} bpd of capacity depends on {chokepoint} and no documented "
            f"bypass route exists for it in this dataset."
        )
    elif uncovered <= 0:
        explanation = (
            f"{at_risk:,.0f} bpd depends on {chokepoint}. Pipeline/alternate-strait bypasses "
            f"({', '.join(o.via for o in options if o.route_type != 'cape_diversion')}) can "
            f"absorb all of it with little to no added transit time."
        )
    elif cape_available:
        cape_days = next(o.extra_transit_days for o in options if o.route_type == "cape_diversion")
        explanation = (
            f"{at_risk:,.0f} bpd depends on {chokepoint}. Fast bypasses cover "
            f"{fast_capacity:,.0f} bpd of that; the remaining {uncovered:,.0f} bpd has no "
            f"pipeline alternative and would need to divert around the Cape of Good Hope, "
            f"adding roughly {cape_days:.0f} days of transit time."
        )
    else:
        explanation = (
            f"{at_risk:,.0f} bpd depends on {chokepoint}. Fast bypasses cover only "
            f"{fast_capacity:,.0f} bpd -- the remaining {uncovered:,.0f} bpd has no documented "
            f"bypass route in this dataset at all."
        )

    return RouteRecommendation(
        chokepoint=chokepoint,
        capacity_at_risk_bpd=at_risk,
        affected_hubs=affected_hubs,
        bypass_options=options,
        fast_bypass_capacity_bpd=fast_capacity,
        uncovered_capacity_bpd=uncovered,
        explanation=explanation,
    )
