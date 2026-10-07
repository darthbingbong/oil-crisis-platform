"""
Unit tests for refineries.py, run independently of the API layer.

Run with:  pytest test_refineries.py -v
"""

import pandas as pd
import pytest

from refineries import (
    capacity_at_risk_bpd,
    capacity_at_risk_pct_of_global,
    load_refineries,
    refineries_at_chokepoint,
)

VALID_CHOKEPOINTS = {"hormuz", "bab el-mandeb", "suez", "malacca", "none"}


@pytest.fixture
def sample_df():
    return pd.DataFrame([
        {"name": "A", "country": "X", "lat": 1.0, "lng": 1.0, "capacity_bpd": 100, "hub_type": "refinery", "nearest_chokepoint": "Hormuz", "notes": ""},
        {"name": "B", "country": "Y", "lat": 2.0, "lng": 2.0, "capacity_bpd": 300, "hub_type": "export_terminal", "nearest_chokepoint": "Hormuz", "notes": ""},
        {"name": "C", "country": "Z", "lat": 3.0, "lng": 3.0, "capacity_bpd": 200, "hub_type": "refinery", "nearest_chokepoint": "Malacca", "notes": ""},
        {"name": "D", "country": "W", "lat": 4.0, "lng": 4.0, "capacity_bpd": 500, "hub_type": "refinery", "nearest_chokepoint": "none", "notes": ""},
    ])


# ---------------------------------------------------------------------------
# refineries_at_chokepoint
# ---------------------------------------------------------------------------

def test_refineries_at_chokepoint_filters_correctly(sample_df):
    result = refineries_at_chokepoint(sample_df, "Hormuz")
    assert set(result["name"]) == {"A", "B"}


def test_refineries_at_chokepoint_case_insensitive(sample_df):
    result = refineries_at_chokepoint(sample_df, "hormuz")
    assert len(result) == 2


def test_refineries_at_chokepoint_no_match_returns_empty(sample_df):
    result = refineries_at_chokepoint(sample_df, "Bab el-Mandeb")
    assert len(result) == 0


# ---------------------------------------------------------------------------
# capacity_at_risk_bpd
# ---------------------------------------------------------------------------

def test_capacity_at_risk_bpd_sums_matching_hubs(sample_df):
    assert capacity_at_risk_bpd(sample_df, "Hormuz") == 400
    assert capacity_at_risk_bpd(sample_df, "Malacca") == 200
    assert capacity_at_risk_bpd(sample_df, "none") == 500


def test_capacity_at_risk_bpd_unknown_chokepoint_is_zero(sample_df):
    assert capacity_at_risk_bpd(sample_df, "Suez") == 0


# ---------------------------------------------------------------------------
# capacity_at_risk_pct_of_global
# ---------------------------------------------------------------------------

def test_capacity_at_risk_pct_of_global(sample_df):
    pct = capacity_at_risk_pct_of_global(sample_df, "Hormuz", global_daily_production_bbl=1000)
    assert pct == pytest.approx(0.4)


def test_capacity_at_risk_pct_of_global_zero_denominator_is_zero(sample_df):
    assert capacity_at_risk_pct_of_global(sample_df, "Hormuz", global_daily_production_bbl=0) == 0.0


# ---------------------------------------------------------------------------
# Real dataset sanity checks -- catch data-entry mistakes in refineries.csv,
# not just bugs in the query functions
# ---------------------------------------------------------------------------

def test_real_dataset_loads_and_has_required_columns():
    df = load_refineries()
    required = {"name", "country", "lat", "lng", "capacity_bpd", "hub_type", "nearest_chokepoint", "notes"}
    assert required.issubset(df.columns)
    assert len(df) > 0


def test_real_dataset_capacities_are_positive():
    df = load_refineries()
    assert (df["capacity_bpd"] > 0).all()


def test_real_dataset_chokepoints_are_known_values():
    df = load_refineries()
    assert set(df["nearest_chokepoint"].str.lower()).issubset(VALID_CHOKEPOINTS)


def test_real_dataset_coordinates_in_valid_ranges():
    df = load_refineries()
    assert df["lat"].between(-90, 90).all()
    assert df["lng"].between(-180, 180).all()


def test_real_dataset_hormuz_capacity_at_risk_is_substantial():
    """Sanity check on the real data: Hormuz-dependent hubs (Ras Tanura,
    Jamnagar, Kharg Island, Ras Laffan) should sum to a multi-million bpd
    figure, not something trivially small -- a wrong chokepoint label
    would silently break this."""
    df = load_refineries()
    assert capacity_at_risk_bpd(df, "Hormuz") > 1_000_000
