"""HealthAssist API v1 — POST /pmjay-check"""

from __future__ import annotations

from fastapi import APIRouter
from app.schemas.pmjay import PMJAYCheckRequest, PMJAYResult
from app.core.pmjay.eligibility_checker import check_eligibility

router = APIRouter()


@router.post(
    "/pmjay-check",
    response_model=PMJAYResult,
    summary="Check PMJAY/Ayushman Bharat eligibility",
    description=(
        "Indicative eligibility check based on ration card type, income, and state. "
        "NOT a substitute for the official PMJAY portal check."
    ),
)
async def pmjay_check(body: PMJAYCheckRequest) -> PMJAYResult:
    # NOTE: PMJAY checks are never cached (rules may update frequently)
    return check_eligibility(body)
