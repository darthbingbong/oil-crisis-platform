"""
Unit tests for routing.py, run independently of the API layer.

Run with:  pytest test_routing.py -v
"""

import pandas as pd
import pytest

from routing import (
    bypass_options_for_chokepoint,
    fast_bypass_capacity_bpd,
    has_cape_diversion,
    load_bypass_routes,
    recommend_reroute,
)


@pytest.fixture
def sample_routes_df():
    return pd.DataFrame([
        {"chokepoint": "Hormuz", "via": "Pipeline A", "route_type": "pipeline", "capacity_bpd": 1000, "extra_transit_days": 0, "notes": ""},
        {"chokepoint": "Hormuz", "via": "Pipeline B", "route_type": "pipeline", "capacity_bpd": 500, "extra_transit_days": 0, "notes": ""},
        {"chokepoint": "Hormuz", "via": "Cape diversion", "route_type": "cape_diversion", "capacity_bpd": None, "extra_transit_days": 12, "notes": ""},
        {"chokepoint": "Malacca", "via": "Strait X", "route_type": "alternate_strait", "capacity_bpd": 300, "extra_transit_days": 2, "notes": ""},
        {"chokepoint": "Bab el-Mandeb", "via": "Cape diversion", "route_type": "cape_diversion", "capacity_bpd": None, "extra_transit_days": 12, "notes": ""},
    ])


@pytest.fixture
def sample_refineries_df():
    return pd.DataFrame([
        {"name": "A", "country": "X", "lat": 1.0, "lng": 1.0, "capacity_bpd": 800, "hub_type": "refinery", "nearest_chokepoint": "Hormuz", "notes": ""},
        {"name": "B", "country": "Y", "lat": 2.0, "lng": 2.0, "capacity_bpd": 1000, "hub_type": "refinery", "nearest_chokepoint": "Hormuz", "notes": ""},
        {"name": "C", "country": "Z", "lat": 3.0, "lng": 3.0, "capacity_bpd": 200, "hub_type": "refinery", "nearest_chokepoint": "Malacca", "notes": ""},
    ])


# ---------------------------------------------------------------------------
# bypass_options_for_chokepoint / fast_bypass_capacity_bpd / has_cape_diversion
# ---------------------------------------------------------------------------

def test_bypass_options_filters_by_chokepoint(sample_routes_df):
    options = bypass_options_for_chokepoint(sample_routes_df, "Hormuz")
    assert len(options) == 3
    assert set(options["via"]) == {"Pipeline A", "Pipeline B", "Cape diversion"}


def test_bypass_options_case_insensitive(sample_routes_df):
    options = bypass_options_for_chokepoint(sample_routes_df, "hormuz")
    assert len(options) == 3


def test_bypass_options_no_match_returns_empty(sample_routes_df):
    options = bypass_options_for_chokepoint(sample_routes_df, "Suez")
    assert len(options) == 0


def test_fast_bypass_capacity_excludes_cape_diversion(sample_routes_df):
    assert fast_bypass_capacity_bpd(sample_routes_df, "Hormuz") == 1500


def test_fast_bypass_capacity_zero_when_only_cape_diversion(sample_routes_df):
    assert fast_bypass_capacity_bpd(sample_routes_df, "Bab el-Mandeb") == 0


def test_has_cape_diversion_true(sample_routes_df):
    assert has_cape_diversion(sample_routes_df, "Hormuz") is True


def test_has_cape_diversion_false(sample_routes_df):
    assert has_cape_diversion(sample_routes_df, "Malacca") is False


# ---------------------------------------------------------------------------
# recommend_reroute
# ---------------------------------------------------------------------------

def test_recommend_reroute_uncovered_capacity(sample_refineries_df, sample_routes_df):
    result = recommend_reroute(sample_refineries_df, sample_routes_df, "Hormuz")
    assert result.capacity_at_risk_bpd == 1800
    assert result.fast_bypass_capacity_bpd == 1500
    assert result.uncovered_capacity_bpd == 300
    assert set(result.affected_hubs) == {"A", "B"}
    assert "Cape of Good Hope" in result.explanation
    assert "12" in result.explanation


def test_recommend_reroute_fully_covered(sample_refineries_df, sample_routes_df):
    result = recommend_reroute(sample_refineries_df, sample_routes_df, "Malacca")
    assert result.capacity_at_risk_bpd == 200
    assert result.fast_bypass_capacity_bpd == 300
    assert result.uncovered_capacity_bpd == 0
    assert "little to no added transit time" in result.explanation


def test_recommend_reroute_no_capacity_at_risk(sample_refineries_df, sample_routes_df):
    result = recommend_reroute(sample_refineries_df, sample_routes_df, "Suez")
    assert result.capacity_at_risk_bpd == 0
    assert result.bypass_options == []
    assert "No tracked" in result.explanation


def test_recommend_reroute_bypass_option_fields(sample_refineries_df, sample_routes_df):
    result = recommend_reroute(sample_refineries_df, sample_routes_df, "Hormuz")
    cape = next(o for o in result.bypass_options if o.route_type == "cape_diversion")
    assert cape.capacity_bpd is None
    assert cape.extra_transit_days == 12
    pipeline = next(o for o in result.bypass_options if o.via == "Pipeline A")
    assert pipeline.capacity_bpd == 1000


# ---------------------------------------------------------------------------
# Real dataset sanity checks
# ---------------------------------------------------------------------------

def test_real_dataset_loads_and_has_required_columns():
    df = load_bypass_routes()
    required = {"chokepoint", "via", "route_type", "capacity_bpd", "extra_transit_days", "notes"}
    assert required.issubset(df.columns)
    assert len(df) > 0


def test_real_dataset_every_tracked_chokepoint_has_at_least_one_route():
    df = load_bypass_routes()
    for chokepoint in ["Hormuz", "Bab el-Mandeb", "Suez", "Malacca"]:
        assert len(bypass_options_for_chokepoint(df, chokepoint)) >= 1, chokepoint


def test_real_dataset_cape_diversion_rows_have_no_capacity_limit():
    df = load_bypass_routes()
    cape_rows = df[df["route_type"] == "cape_diversion"]
    assert len(cape_rows) > 0
    assert cape_rows["capacity_bpd"].isna().all()


def test_real_dataset_pipeline_rows_have_positive_capacity():
    df = load_bypass_routes()
    pipeline_rows = df[df["route_type"].isin(["pipeline", "alternate_strait"])]
    assert (pipeline_rows["capacity_bpd"] > 0).all()


def test_real_dataset_hormuz_reroute_matches_refineries_data():
    """Integration sanity check against the real refineries.csv: Hormuz has
    ~6.19M bpd at-risk capacity (Ras Tanura, Jamnagar, Kharg Island, Ras
    Laffan) and ~6.5M bpd of aggregate pipeline bypass capacity (Petroline
    + ADCOP), so under this module's documented aggregate-pool
    simplification, uncovered_capacity_bpd comes out to 0 -- even though
    Petroline in reality only carries Saudi crude and wouldn't actually
    help India's Jamnagar or Iran's Kharg Island specifically (see the
    KNOWN SIMPLIFICATION note in routing.py). This test locks in that
    documented (if imperfect) behavior rather than a false "fully safe"
    claim about individual hubs."""
    from refineries import load_refineries

    refineries_df = load_refineries()
    routes_df = load_bypass_routes()
    result = recommend_reroute(refineries_df, routes_df, "Hormuz")
    assert result.capacity_at_risk_bpd > 6_000_000
    assert result.fast_bypass_capacity_bpd > 6_000_000
    assert result.uncovered_capacity_bpd == 0
    assert set(result.affected_hubs) == {"Ras Tanura", "Jamnagar", "Kharg Island", "Ras Laffan"}
