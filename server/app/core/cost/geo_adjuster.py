"""
HealthAssist — Geographic Cost Adjuster
Applies city-tier pricing premiums over CGHS/Tier-2 base rates.
"""

from __future__ import annotations

from typing import Tuple

# City tier classification
METRO_CITIES = {
    "mumbai", "delhi", "new delhi", "bengaluru", "bangalore",
    "hyderabad", "chennai", "kolkata"
}
TIER1_CITIES = {
    "pune", "ahmedabad", "surat", "jaipur", "lucknow", "kanpur",
    "nagpur", "indore", "thane", "bhopal", "visakhapatnam",
    "patna", "vadodara", "ghaziabad", "ludhiana", "agra", "nashik",
    "faridabad", "meerut", "rajkot", "varanasi"
}

GEO_PREMIUM = {
    "metro": (1.40, 1.60),   # 40–60% over base
    "tier1": (1.20, 1.30),   # 20–30% over base
    "tier2": (1.00, 1.00),   # base (reference)
    "tier3": (0.80, 0.90),   # −10–20% below base
}


def classify_city(city: str) -> str:
    """Returns 'metro' | 'tier1' | 'tier2' | 'tier3'."""
    city_lower = city.strip().lower()
    if city_lower in METRO_CITIES:
        return "metro"
    if city_lower in TIER1_CITIES:
        return "tier1"
    return "tier2"  # Default for unknown cities


def apply_geo_premium(
    base_min: int,
    base_max: int,
    city: str,
) -> Tuple[int, int, str]:
    """
    Apply geographic pricing premium to cost range.
    Returns (adjusted_min, adjusted_max, city_tier)
    """
    city_tier = classify_city(city)
    min_mult, max_mult = GEO_PREMIUM[city_tier]

    adjusted_min = int(base_min * min_mult)
    adjusted_max = int(base_max * max_mult)

    return adjusted_min, adjusted_max, city_tier
