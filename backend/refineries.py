"""
Refinery / export-hub capacity module.

Loads the real-world refinery and crude-export-terminal dataset
(data/refineries.csv) and provides small, pure query functions over it --
no ML, just filtering and aggregation. Mirrors the pattern already used
for events.csv (loaded once in main.py) and for ev_lithium.py: load data
once, expose pure functions that are easy to test independently of the
API layer.

Capacity and coordinate figures in the dataset are approximate, public,
rounded estimates (various years/sources) -- good enough for GIS
visualization and rough what-if capacity-at-risk estimates, not for
operational or trading decisions. Flagged the same way PHASE1_SUMMARY.md
flags its own estimated event fields.
"""

import pandas as pd

REFINERIES_CSV_PATH = "data/refineries.csv"


def load_refineries(path: str = REFINERIES_CSV_PATH) -> pd.DataFrame:
    return pd.read_csv(path)


def refineries_at_chokepoint(df: pd.DataFrame, chokepoint: str) -> pd.DataFrame:
    """Hubs whose crude supply/export route depends on the given chokepoint."""
    return df[df["nearest_chokepoint"].str.lower() == chokepoint.lower()]


def capacity_at_risk_bpd(df: pd.DataFrame, chokepoint: str) -> float:
    """Total barrels/day of refining+export capacity dependent on one chokepoint."""
    return float(refineries_at_chokepoint(df, chokepoint)["capacity_bpd"].sum())


def capacity_at_risk_pct_of_global(
    df: pd.DataFrame,
    chokepoint: str,
    global_daily_production_bbl: float,
) -> float:
    """capacity_at_risk_bpd expressed as a fraction of total global daily crude production."""
    if global_daily_production_bbl <= 0:
        return 0.0
    return capacity_at_risk_bpd(df, chokepoint) / global_daily_production_bbl
