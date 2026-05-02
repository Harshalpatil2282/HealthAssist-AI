"""
HealthAssist — Cost Estimation Pipeline (Main Orchestrator)
Assembles all cost sub-modules into a final CostEstimate.
"""

from __future__ import annotations

from typing import List, Optional

import structlog

from app.schemas.search import CostEstimate, CostComponent
from app.core.cost.component_model import build_cost_components
from app.core.cost.geo_adjuster import apply_geo_premium, classify_city
from app.core.cost.risk_adjuster import apply_risk_adjustment
from app.core.cost.confidence_scorer import calculate_confidence, build_data_sources

logger = structlog.get_logger(__name__)

COST_DISCLAIMER = (
    "This is an estimate for planning purposes only. "
    "Actual costs may vary. Please verify directly with the hospital."
)


async def estimate_cost(
    procedure_category: str,
    body_system: Optional[str] = None,
    hospital_tier: str = "mid",
    city: str = "Pune",
    patient_age: int = 40,
    comorbidities: Optional[List[str]] = None,
    room_preference: str = "general",
) -> CostEstimate:
    """
    Main cost estimation pipeline.
    Returns CostEstimate with component breakdown, confidence, and disclaimer.
    """
    comorbidities = comorbidities or []
    body_system = body_system or "general"

    logger.info(
        "Cost estimation started",
        procedure=procedure_category,
        tier=hospital_tier,
        city=city,
        age=patient_age,
        comorbidities=comorbidities,
    )

    # ── Step 1: Geographic premium ────────────────────────────────────────────
    # Get geo multipliers (will be applied inside component model)
    city_tier = classify_city(city)
    from app.core.cost.geo_adjuster import GEO_PREMIUM
    geo_min_mult, geo_max_mult = GEO_PREMIUM.get(city_tier, (1.0, 1.0))

    # ── Step 2: Build 5-component model ──────────────────────────────────────
    components, synthetic_used = build_cost_components(
        procedure_category=procedure_category,
        body_system=body_system,
        hospital_tier=hospital_tier,
        room_preference=room_preference,
        geo_min_mult=geo_min_mult,
        geo_max_mult=geo_max_mult,
    )

    # ── Step 3: Risk adjustment (comorbidities + age) ─────────────────────────
    # Apply to procedure cost component (component[0]) and propagate
    base_total_min = sum(c.min_amount for c in components)
    base_total_max = sum(c.max_amount for c in components)

    adj_min, adj_max, risk_mult, matched_comorbs, risk_flags = apply_risk_adjustment(
        base_min=base_total_min,
        base_max=base_total_max,
        comorbidities=comorbidities,
        patient_age=patient_age,
    )

    # If risk adjusted, add a contingency risk component
    if risk_mult > 1.0:
        extra_min = adj_min - base_total_min
        extra_max = adj_max - base_total_max
        if extra_min > 0:
            components.append(CostComponent(
                name="Risk-Adjusted Contingency",
                min_amount=extra_min,
                max_amount=extra_max,
                notes=f"Additional buffer due to: {', '.join(matched_comorbs) or 'age factor'}. "
                      f"Risk multiplier: {risk_mult:.2f}×",
            ))

    total_min = sum(c.min_amount for c in components)
    total_max = sum(c.max_amount for c in components)

    # ── Step 4: Confidence scoring ────────────────────────────────────────────
    from app.core.cost.component_model import PROCEDURE_BASE_RATES
    is_common = procedure_category.lower() in PROCEDURE_BASE_RATES

    confidence = calculate_confidence(
        has_real_cghs_data=is_common,
        has_real_hospital_data=True,     # Assume hospital data from DB
        is_common_procedure=is_common,
        comorbidities_provided=bool(comorbidities),
        hospital_tier_known=hospital_tier in ("budget", "mid", "premium"),
        city_known=bool(city),
        synthetic_data_used=synthetic_used,
    )

    data_sources = build_data_sources(
        has_cghs_data=is_common,
        has_pmjay_data=is_common,
        synthetic_data_used=synthetic_used,
    )

    logger.info(
        "Cost estimation complete",
        total_min=total_min,
        total_max=total_max,
        confidence=confidence,
        city_tier=city_tier,
        risk_mult=risk_mult,
    )

    return CostEstimate(
        components=components,
        total_min=total_min,
        total_max=total_max,
        confidence=confidence,
        risk_flags=risk_flags,
        data_sources=data_sources,
        synthetic_data_used=synthetic_used,
        disclaimer=COST_DISCLAIMER,
    )
