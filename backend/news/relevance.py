"""
Keyword/topic relevance filter -- runs BEFORE spending an LLM call on an
article. Deliberately broad: a false positive here just costs one wasted
classification call (a few cents); a false negative silently drops a real
story before anyone ever sees it. Err toward the former.
"""

# The four tracked chokepoints plus the alternate names/spellings they
# commonly appear under in general news (not just financial press) --
# these incidents often break as geopolitical news before financial news
# picks them up, per the project brief.
CHOKEPOINT_TERMS = [
    "hormuz",
    "strait of hormuz",
    "bab el-mandeb",
    "bab al-mandab",
    "mandeb strait",
    "suez canal",
    "strait of malacca",
    "malacca strait",
]

# Major oil-producing/transiting countries whose news often implies supply
# risk even when the article never says "oil" explicitly.
COUNTRY_TERMS = [
    "saudi arabia",
    "iran",
    "iraq",
    "united arab emirates",
    "kuwait",
    "russia",
    "venezuela",
    "nigeria",
    "libya",
    "qatar",
    "oman",
    "yemen",
    "angola",
    "algeria",
    "kazakhstan",
]

CORE_OIL_TERMS = [
    "opec",
    "crude oil",
    "crude price",
    "oil price",
    "oil prices",
    "petroleum",
    "barrels per day",
    "oil tanker",
    "tanker attack",
    "oil pipeline",
    "refinery",
    "oil export",
    "oil embargo",
    "oil sanctions",
    "energy sanctions",
    "shipping lane",
    "maritime attack",
    "drone strike on oil",
]

EV_LITHIUM_TERMS = [
    # Deliberately NOT a bare "lithium" -- verified against real NewsAPI
    # output that it matches consumer battery/flashlight deal listings
    # ("RYOBI USB Lithium Inspection Light Kit", "EBL Lithium AA
    # Batteries"), which have nothing to do with the EV supply chain.
    "ev battery",
    "ev batteries",
    "electric vehicle supply",
    "battery supply chain",
    "lithium mine",
    "lithium mining",
    "lithium production",
    "lithium carbonate",
    "lithium supply",
    "lithium prices",
    "lithium market",
    "lithium deposit",
    "lithium reserves",
]

ALL_TERMS = [
    t.lower() for t in CHOKEPOINT_TERMS + COUNTRY_TERMS + CORE_OIL_TERMS + EV_LITHIUM_TERMS
]


def is_relevant(title: str, description: str) -> bool:
    """Cheap substring match against the keyword list above. Not a
    classifier -- just a pre-filter to avoid paying for an LLM call on
    obviously unrelated stories (sports, local news, etc.)."""
    text = f"{title} {description}".lower()
    return any(term in text for term in ALL_TERMS)
