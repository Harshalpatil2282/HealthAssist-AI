"""HealthAssist — Pydantic v2 Schemas: Drug Comparison"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class DrugVariant(BaseModel):
    name: str
    manufacturer: str
    price_per_unit: float  # INR
    unit: str  # "tablet" | "ml" | "vial"
    is_generic: bool
    available_jan_aushadhi: bool = False
    notes: Optional[str] = None


class DrugComparison(BaseModel):
    brand_drug: str
    molecule: str  # Active ingredient
    strength: str
    brand_variants: List[DrugVariant]
    generic_variants: List[DrugVariant]
    potential_savings_pct: float = Field(ge=0, le=100)
    disclaimer: str = (
        "Generic drugs contain the same active ingredient as brand drugs. "
        "Always consult your doctor or pharmacist before switching medications."
    )


class TriageRequest(BaseModel):
    symptoms: List[str] = Field(..., min_length=1)
    duration_days: Optional[int] = Field(None, ge=0)
    severity: Optional[str] = Field(None, pattern=r"^(mild|moderate|severe)$")
    patient_age: Optional[int] = Field(None, ge=0, le=120)
    language: str = Field("en", pattern=r"^[a-z]{2}$")


class TriageResult(BaseModel):
    urgency_level: str  # "emergency" | "urgent" | "semi-urgent" | "routine"
    recommended_action: str
    specialist_type: Optional[str] = None
    emergency_services: bool = False
    disclaimer: str = (
        "This triage is for informational purposes only. "
        "For any medical emergency, call 112 immediately. "
        "Always consult a qualified doctor for medical advice."
    )
