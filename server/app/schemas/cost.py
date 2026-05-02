"""HealthAssist — Pydantic v2 Schemas: Cost Estimation"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

# Import the canonical CostComponent — defined once in schemas.search and shared
from app.schemas.search import CostComponent  # noqa: F401  (re-exported for consumers)


class CostEstimateRequest(BaseModel):
    procedure_code: Optional[str] = None
    procedure_name: Optional[str] = None
    hospital_id: Optional[str] = None
    hospital_tier: Optional[str] = Field(None, pattern=r"^(budget|mid|premium)$")
    city: Optional[str] = None
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    patient_age: Optional[int] = Field(None, ge=0, le=120)
    comorbidities: List[str] = []
    room_preference: str = Field("general", pattern=r"^(general|semi_private|private|icu)$")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "procedure_name": "Coronary Angioplasty",
                "hospital_tier": "mid",
                "city": "Pune",
                "patient_age": 62,
                "comorbidities": ["diabetes", "hypertension"],
            }
        }
    )


class CostEstimateResponse(BaseModel):
    procedure_name: str
    hospital_tier: str
    city_tier: str
    components: List[CostComponent]
    total_min: int
    total_max: int
    confidence: float = Field(ge=0.0, le=1.0)
    risk_flags: List[str] = []
    data_sources: List[str] = []
    synthetic_data_used: bool = False
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    disclaimer: str = (
        "This is an estimate for planning purposes only. "
        "Actual costs may vary. Please verify directly with the hospital."
    )
