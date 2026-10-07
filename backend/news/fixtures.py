"""
Fixture articles for the manual test-injection path (POST
/api/v1/news/test-inject in main.py) -- lets the whole ingestion ->
relevance -> classification pipeline be verified without waiting for real
news or needing a news-API key. Covers a spread of event_types and
severities, plus one that should get filtered before classification and
one that should classify but land below the confidence threshold.
"""

from .models import Article

FIXTURES: dict[str, Article] = {
    "hormuz_attack": Article(
        title="Tanker Attacked Near Strait of Hormuz, Oil Prices Jump",
        description=(
            "A crude oil tanker was struck by an explosive device while transiting the Strait "
            "of Hormuz on Tuesday, the latest in a series of incidents in the critical waterway "
            "through which roughly a fifth of global oil supply passes. No casualties were "
            "reported, but the vessel was forced to return to port for repairs. Shipping "
            "insurers have raised war-risk premiums for the route in response."
        ),
        url="https://example.com/news/hormuz-tanker-attack-2026",
        source="Reuters (fixture)",
        published_at="20261007T120000",
    ),
    "opec_cut": Article(
        title="OPEC+ Agrees to Deepen Production Cuts by 1 Million Barrels Per Day",
        description=(
            "OPEC and its allies agreed on Thursday to cut crude oil production by an "
            "additional 1 million barrels per day starting next month, citing concerns over "
            "global demand weakness. The cut is larger than analysts had expected and signals "
            "the group's intent to defend prices."
        ),
        url="https://example.com/news/opec-production-cut-2026",
        source="Bloomberg (fixture)",
        published_at="20261006T090000",
    ),
    "lithium_discovery": Article(
        title="Major New Lithium Deposit Discovered in Nevada, Could Boost US EV Supply Chain",
        description=(
            "Geologists have confirmed a significant lithium deposit in central Nevada that "
            "could substantially increase US domestic lithium production once developed, "
            "reducing reliance on imported battery materials for the EV industry."
        ),
        url="https://example.com/news/nevada-lithium-discovery-2026",
        source="AP (fixture)",
        published_at="20261005T140000",
    ),
    "ambiguous_low_confidence": Article(
        title="Analysts Debate Whether Recent Price Moves Reflect Supply Concerns",
        description=(
            "Market commentators offered mixed views this week on the drivers behind recent "
            "oil price volatility, with some pointing to seasonal demand patterns around OPEC "
            "meetings and others citing broader macroeconomic uncertainty. No consensus "
            "emerged, and several analysts cautioned against reading too much into the move."
        ),
        url="https://example.com/news/analyst-debate-2026",
        source="MarketWatch (fixture)",
        published_at="20261004T080000",
    ),
    "lithium_mine_disrupted": Article(
        title="Major Lithium Mine Forced to Halt Production Amid Labor Strike",
        description=(
            "A labor strike at one of the world's largest lithium mines has forced operators "
            "to halt output indefinitely, tightening available supply for the global EV battery "
            "industry just as demand accelerates."
        ),
        url="https://example.com/news/lithium-mine-strike-halt-2026",
        source="Mining Weekly (fixture)",
        published_at="20261007T110000",
    ),
    "lithium_mine_expansion": Article(
        title="New Lithium Mine Ramps Up Production, Easing Global Battery Supply Concerns",
        description=(
            "A newly expanded lithium mining operation has begun ramping up output, easing "
            "concerns about tight battery-grade lithium supply for the fast-growing EV industry."
        ),
        url="https://example.com/news/lithium-mine-expansion-eases-supply-2026",
        source="Mining Weekly (fixture)",
        published_at="20261007T130000",
    ),
    "unrelated": Article(
        title="Local Bakery Wins Regional Pastry Competition",
        description=(
            "A small bakery in the suburbs took first prize at this year's regional pastry "
            "championship, beating out over forty other entrants with a hazelnut croissant."
        ),
        url="https://example.com/news/bakery-award-2026",
        source="Local News (fixture)",
        published_at="20261003T100000",
    ),
}
