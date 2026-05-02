"""HealthAssist — Pydantic v2 Schemas: Hospital"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class HospitalListRequest(BaseModel):
    city: Optional[str] = None
    pincode: Optional[str] = Field(None, pattern=r"^\d{6}$")
    hospital_type: Optional[str] = Field(None, pattern=r"^(government|private|trust|both)$")
    accepts_pmjay: Optional[bool] = None
    accreditation: Optional[str] = None  # "NABH" | "JCI"
    page: int = Field(1, ge=1)
    per_page: int = Field(10, ge=1, le=50)


class HospitalBed(BaseModel):
    total: Optional[int] = None
    icu: Optional[int] = None
    general: Optional[int] = None


class HospitalReview(BaseModel):
    source: str  # "google"
    rating: float
    count: int
    sentiment_score: Optional[float] = None  # NLP polarity -1 to 1


class HospitalDetail(BaseModel):
    id: str
    name: str
    address: str
    city: str
    state: str
    pincode: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    hospital_type: str
    tier: str  # "premium" | "mid" | "budget"
    specializations: List[str] = []
    accreditation: List[str] = []
    beds: Optional[HospitalBed] = None
    review: Optional[HospitalReview] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    accepts_pmjay: bool = False
    empanelled_cghs: bool = False
    established_year: Optional[int] = None
    emergency_services: bool = False
    procedures_offered: List[str] = []
