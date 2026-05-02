"""HealthAssist — Pydantic v2 Schemas: Search Request & Response"""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Constants ─────────────────────────────────────────────────────────────────
QUERY_MAX_LENGTH = 500
_INJECTION_PATTERN = re.compile(r"[<>{};`\"'\\]")


# ── Input Sanitization ────────────────────────────────────────────────────────
def sanitize_query(query: str) -> str:
    """
    Strip prompt-injection vectors and enforce length limit.
    Removes: < > { } ; ` " ' \\
    """
    cleaned = _INJECTION_PATTERN.sub("", query).strip()
    return cleaned[:QUERY_MAX_LENGTH]


# ── Sub-models ────────────────────────────────────────────────────────────────
class LocationInput(BaseModel):
    pincode: Optional[str] = Field(
        None,
        description="6-digit pincode OR city name (e.g. 'Pune' or '411001')",
        examples=["411001", "Kochi"],
    )
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "LocationInput":
        if not self.pincode and not (self.lat and self.lng):
            raise ValueError("Provide either pincode/city or lat/lng pair")
        return self


class ParsedIntent(BaseModel):
    procedure_category: str
    body_system: Optional[str] = None
    icd10_code: Optional[str] = None
    icd10_candidates: List[str] = []
    clinical_context: List[str] = []
    ambiguity_flags: List[str] = []
    emergency_flag: bool = False
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    # Location extracted from query (e.g. "knee replacement Pune" → city="Pune")
    city: Optional[str] = None
    state: Optional[str] = None


class ScoreBreakdown(BaseModel):
    clinical: float = Field(0.0, ge=0, le=100)
    reputation: float = Field(0.0, ge=0, le=100)
    accessibility: float = Field(0.0, ge=0, le=100)
    affordability: float = Field(0.0, ge=0, le=100)
    overall: float = Field(0.0, ge=0, le=100)


class CostRange(BaseModel):
    min_amount: int
    max_amount: int
    currency: str = "INR"


class HospitalCard(BaseModel):
    id: str
    name: str
    address: str
    city: str
    state: str
    distance_km: Optional[float] = None
    rating: float = Field(0.0, ge=0, le=5)
    review_count: int = 0
    accreditation: List[str] = []
    hospital_type: str  # "private" | "government" | "trust"
    tier: str = "mid"   # "budget" | "mid" | "premium"
    score_breakdown: ScoreBreakdown
    cost_range: CostRange
    accepts_pmjay: bool = False
    emergency_services: bool = False
    phone: Optional[str] = None
    website: Optional[str] = None
    specializations: List[str] = []
    procedures_offered: List[str] = []
    total_beds: Optional[int] = None
    icu_beds: Optional[int] = None
    rank: int = 0  # 1-based rank in results list


class CostComponent(BaseModel):
    name: str
    min_amount: int
    max_amount: int
    notes: Optional[str] = None


class CostEstimate(BaseModel):
    components: List[CostComponent]
    total_min: int
    total_max: int
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    risk_flags: List[str] = []
    data_sources: List[str] = []
    synthetic_data_used: bool = False
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    disclaimer: str = (
        "This is an estimate for planning purposes only. "
        "Actual costs may vary. Please verify directly with the hospital."
    )


class EmergencyAlert(BaseModel):
    message: str = "⚠️ Your query contains emergency symptoms. Please seek immediate help."
    helpline_national: str = "112"
    helpline_aiims: str = "1800-11-7222"
    action: str = "Go to the nearest emergency room immediately."
    detected_keywords: List[str] = []


# ── Request ───────────────────────────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=QUERY_MAX_LENGTH,
                       description="Natural language health query (max 500 chars)")
    location: Optional[LocationInput] = None
    radius_km: int = Field(25, ge=1, le=200)
    budget_min: Optional[int] = Field(None, ge=0)
    budget_max: Optional[int] = Field(None, ge=0)
    patient_age: Optional[int] = Field(None, ge=0, le=120)
    comorbidities: List[str] = Field(default=[], max_length=10)
    hospital_type: Optional[str] = Field(None, pattern=r"^(government|private|trust|both)$")
    language: str = Field("en", pattern=r"^[a-z]{2}$")
    accreditation_filter: Optional[str] = Field(None, description="Filter by accreditation e.g. NABH, JCI")

    @field_validator("query", mode="before")
    @classmethod
    def sanitize(cls, v: str) -> str:
        return sanitize_query(v)

    @model_validator(mode="after")
    def budget_logic(self) -> "SearchRequest":
        if self.budget_min and self.budget_max and self.budget_min > self.budget_max:
            raise ValueError("budget_min must be ≤ budget_max")
        return self


# ── Response ──────────────────────────────────────────────────────────────────
class SearchResponse(BaseModel):
    query_id: str = Field(default_factory=lambda: str(uuid4()))
    parsed_intent: ParsedIntent
    hospitals: List[HospitalCard]
    cost_estimate: CostEstimate
    emergency_alert: Optional[EmergencyAlert] = None
    pmjay_prompt: bool = False
    data_confidence: float = Field(0.0, ge=0.0, le=1.0)
    disclaimer: str = (
        "HealthAssist provides information for planning purposes only. "
        "Always consult a qualified medical professional for diagnosis and treatment."
    )
