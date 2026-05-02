"""HealthAssist — Affordability Score Calculator"""

from __future__ import annotations

from typing import Optional


# Hospital tier cost range proxies (INR, mid-range procedure like knee replacement)
TIER_COST_RANGES = {
    "budget": (80_000, 200_000),
    "mid": (200_000, 500_000),
    "premium": (500_000, 1_500_000),
}


def calculate_affordability_score(
    hospital_tier: str,                   # "budget" | "mid" | "premium"
    accepts_pmjay: bool = False,
    budget_min: Optional[int] = None,
    budget_max: Optional[int] = None,
) -> float:
    """
    Score 0–100 based on affordability signals.
    
    Components:
    - Hospital tier baseline:   0–50 pts (budget=50, mid=30, premium=10)
    - PMJAY acceptance:        +20 pts
    - Budget alignment:         0–30 pts (if user provided budget)
    """
    score = 0.0

    # ── Tier baseline ─────────────────────────────────────────────────────────
    tier_baseline = {"budget": 50.0, "mid": 30.0, "premium": 10.0}
    score += tier_baseline.get(hospital_tier.lower(), 30.0)

    # ── PMJAY acceptance ──────────────────────────────────────────────────────
    if accepts_pmjay:
        score += 20.0

    # ── Budget alignment ──────────────────────────────────────────────────────
    if budget_max is not None:
        tier_min, tier_max = TIER_COST_RANGES.get(hospital_tier.lower(), (200_000, 500_000))
        tier_mid = (tier_min + tier_max) / 2

        if tier_mid <= budget_max:
            # Hospital fits in budget
            if budget_min is not None and tier_mid >= budget_min:
                score += 30.0  # Perfect alignment
            else:
                score += 20.0  # Within max budget
        elif tier_min <= budget_max:
            score += 10.0  # Partially within budget
        # else: exceeds budget entirely → 0 pts

    return min(100.0, round(score, 1))
