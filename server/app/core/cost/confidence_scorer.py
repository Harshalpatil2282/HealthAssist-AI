"""
HealthAssist — Bayesian Confidence Scorer
Calculates confidence score for cost estimates based on data quality signals.
"""

from __future__ import annotations

from typing import List
from app.config import settings


def calculate_confidence(
    has_real_cghs_data: bool,
    has_real_hospital_data: bool,
    is_common_procedure: bool,
    comorbidities_provided: bool,
    hospital_tier_known: bool,
    city_known: bool,
    synthetic_data_used: bool,
) -> float:
    """
    Bayesian confidence scoring for cost estimates.
    
    Starts at 0.95 and subtracts penalties for each data gap.
    Final score is clamped to [CONFIDENCE_MIN, CONFIDENCE_MAX].
    
    Penalty schedule:
    - Synthetic data used:            −0.15
    - Sparse/unknown hospital data:   −0.10
    - Uncommon/rare procedure:        −0.10
    - No comorbidities provided:      −0.05
    - Hospital tier unknown:          −0.05
    - City/location unknown:          −0.05
    """
    score = 0.95

    if synthetic_data_used:
        score -= 0.15

    if not has_real_hospital_data:
        score -= 0.10

    if not is_common_procedure:
        score -= 0.10

    if not comorbidities_provided:
        score -= 0.05

    if not hospital_tier_known:
        score -= 0.05

    if not city_known:
        score -= 0.05

    # Note: CGHS data is a bonus, doesn't penalize
    if has_real_cghs_data:
        score = min(score + 0.05, 0.95)

    # Clamp to configured bounds
    return round(
        max(settings.CONFIDENCE_MIN, min(settings.CONFIDENCE_MAX, score)), 2
    )


def build_data_sources(
    has_cghs_data: bool,
    has_pmjay_data: bool,
    synthetic_data_used: bool,
) -> List[str]:
    """Build list of data source labels for the response."""
    sources = []
    if has_cghs_data:
        sources.append("CGHS 2022 Rate Schedule")
    if has_pmjay_data:
        sources.append("PMJAY Package Rates (NHA)")
    if synthetic_data_used:
        sources.append("HealthAssist Synthetic Benchmarks (calibrated to market data)")
    if not sources:
        sources.append("HealthAssist Synthetic Benchmarks")
    return sources
