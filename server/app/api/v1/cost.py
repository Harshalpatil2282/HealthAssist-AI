"""HealthAssist API v1 — POST /cost-estimate"""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas.cost import CostEstimateRequest, CostEstimateResponse
from app.core.cost.estimator import estimate_cost
from app.core.cost.geo_adjuster import classify_city

router = APIRouter()


@router.post(
    "/cost-estimate",
    response_model=CostEstimateResponse,
    summary="Get cost estimate for a procedure",
    description="Returns component-level cost breakdown with confidence score and disclaimer.",
)
async def cost_estimate(
    request: Request,
    body: CostEstimateRequest,
) -> CostEstimateResponse:
    procedure = body.procedure_name or body.procedure_code or "General Medical Consultation"
    city = body.city or "Pune"
    tier = body.hospital_tier or "mid"

    cost = await estimate_cost(
        procedure_category=procedure,
        body_system=None,
        hospital_tier=tier,
        city=city,
        patient_age=body.patient_age or 40,
        comorbidities=body.comorbidities,
        room_preference=body.room_preference,
    )

    return CostEstimateResponse(
        procedure_name=procedure,
        hospital_tier=tier,
        city_tier=classify_city(city),
        components=cost.components,
        total_min=cost.total_min,
        total_max=cost.total_max,
        confidence=cost.confidence,
        risk_flags=cost.risk_flags,
        data_sources=cost.data_sources,
        synthetic_data_used=cost.synthetic_data_used,
        generated_at=cost.generated_at,
        disclaimer=cost.disclaimer,
    )
