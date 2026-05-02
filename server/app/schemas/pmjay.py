"""HealthAssist — Pydantic v2 Schemas: PMJAY Eligibility"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PMJAYCheckRequest(BaseModel):
    state: str = Field(..., min_length=2, max_length=50)
    annual_income: int = Field(..., ge=0, description="Family annual income in INR")
    ration_card_type: str = Field(..., pattern=r"^(BPL|APL|AAY|none)$")
    family_size: int = Field(..., ge=1, le=20)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "state": "Maharashtra",
                "annual_income": 180000,
                "ration_card_type": "BPL",
                "family_size": 4,
            }
        }
    )


class PMJAYResult(BaseModel):
    likely_eligible: bool
    eligibility_reason: str
    coverage_amount: Optional[int] = 500000  # ₹5,00,000 standard
    procedures_covered: int = 1949
    next_steps: List[str] = []
    official_portal: str = "https://pmjay.gov.in"
    helpline: str = "14555"
    disclaimer: str = (
        "This is an indicative eligibility check only, not an official determination. "
        "Please verify your eligibility at pmjay.gov.in or call the PMJAY helpline at 14555."
    )
