"""HealthAssist API v1 — Hospital Endpoints"""

from __future__ import annotations

from typing import List, Optional
import structlog
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.hospital import HospitalDetail, HospitalListRequest
from app.data.synthetic.cost_benchmarks import get_all_hospitals
from app.data.loader import DOCTOR_INDEX

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get(
    "/hospitals",
    summary="List hospitals",
    description="Returns a filtered, paginated list of hospitals from the full 1500+ row real dataset.",
)
async def list_hospitals(
    city: Optional[str] = Query(None, description="Filter by city name"),
    state: Optional[str] = Query(None, description="Filter by state name"),
    hospital_type: Optional[str] = Query(None, pattern="^(government|private|trust|both)$"),
    accepts_pmjay: Optional[bool] = Query(None),
    accreditation: Optional[str] = Query(None, description="NABH or JCI"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
) -> dict:
    hospitals = get_all_hospitals()

    # Apply filters
    if city:
        hospitals = [h for h in hospitals if h.get("city", "").lower() == city.lower()]
    if state:
        hospitals = [h for h in hospitals if h.get("state", "").lower() == state.lower()]
    if hospital_type and hospital_type != "both":
        hospitals = [h for h in hospitals if h.get("hospital_type", "").lower() == hospital_type]
    if accepts_pmjay is not None:
        hospitals = [h for h in hospitals if h.get("accepts_pmjay") == accepts_pmjay]
    if accreditation:
        acc_upper = accreditation.upper()
        hospitals = [
            h for h in hospitals
            if acc_upper in [a.upper() for a in h.get("accreditation", [])]
        ]

    # Pagination
    total = len(hospitals)
    start = (page - 1) * per_page
    end = start + per_page
    page_items = hospitals[start:end]

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "hospitals": page_items,
    }


@router.get(
    "/hospitals/{hospital_id}",
    summary="Get hospital details",
    description="Returns full profile for a single hospital by ID.",
)
async def get_hospital(hospital_id: str) -> dict:
    all_hospitals = get_all_hospitals()
    hospital = next(
        (h for h in all_hospitals if h.get("id") == hospital_id), None
    )
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital with ID '{hospital_id}' not found.",
        )
    return hospital


@router.get(
    "/hospitals/{hospital_id}/doctors",
    summary="List doctors at a hospital",
    description="Returns all doctors linked to the given hospital from the real doctors dataset.",
)
async def get_hospital_doctors(hospital_id: str) -> dict:
    all_hospitals = get_all_hospitals()
    hospital = next(
        (h for h in all_hospitals if h.get("id") == hospital_id), None
    )
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital with ID '{hospital_id}' not found.",
        )

    # For real hospitals the raw hospital_id is numeric (e.g. "42")
    raw_id = hospital.get("hospital_id", hospital_id.replace("real-", ""))
    doctors = DOCTOR_INDEX.get(raw_id, [])

    return {
        "hospital_id": hospital_id,
        "hospital_name": hospital.get("name"),
        "total_doctors": len(doctors),
        "doctors": doctors,
    }
