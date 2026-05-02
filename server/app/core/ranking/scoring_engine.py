"""
HealthAssist — Multi-Signal Hospital Scoring Engine
Orchestrates 4 sub-scorers with configurable weights.
Returns a sorted list of HospitalCard with score breakdowns.
"""

from __future__ import annotations

import math
import uuid
from typing import Any, Dict, List, Optional

import structlog

from app.config import settings
from app.schemas.search import (
    CostRange, HospitalCard, ScoreBreakdown, SearchRequest, ParsedIntent
)
from app.core.ranking.clinical_score import calculate_clinical_score
from app.core.ranking.reputation_score import calculate_reputation_score
from app.core.ranking.accessibility_score import calculate_accessibility_score
from app.core.ranking.affordability_score import calculate_affordability_score

logger = structlog.get_logger(__name__)


def score_hospital(
    hospital: Dict[str, Any],
    intent: ParsedIntent,
    request: SearchRequest,
    distance_km: float,
) -> HospitalCard:
    """
    Score a single hospital across 4 dimensions and build HospitalCard.
    """
    accreditations = hospital.get("accreditation", [])
    specializations = hospital.get("specializations", [])
    tier = hospital.get("tier", "mid")

    # ── Clinical Score ────────────────────────────────────────────────────────
    clinical = calculate_clinical_score(
        hospital_specializations=specializations,
        target_body_system=intent.body_system,
        procedure_category=intent.procedure_category,
        icu_available=(hospital.get("icu_beds", 0) or 0) > 0,
        nabh_accredited="NABH" in accreditations,
        jci_accredited="JCI" in accreditations,
    )

    # ── Reputation Score ──────────────────────────────────────────────────────
    reputation = calculate_reputation_score(
        google_rating=hospital.get("google_rating", 0.0),
        review_count=hospital.get("review_count", 0),
        accreditation=accreditations,
        sentiment_score=hospital.get("sentiment_score", 0.0),
    )

    # ── Accessibility Score ───────────────────────────────────────────────────
    city = hospital.get("city", "").lower()
    # Basic urban classification from city name
    metro_cities = {"mumbai", "delhi", "bengaluru", "bangalore", "hyderabad", "chennai", "kolkata", "pune"}
    city_class = "urban" if city in metro_cities else "semi_urban"

    accessibility = calculate_accessibility_score(
        distance_km=distance_km,
        city_classification=city_class,
        emergency_services=hospital.get("emergency_services", False),
    )

    # ── Affordability Score ───────────────────────────────────────────────────
    affordability = calculate_affordability_score(
        hospital_tier=tier,
        accepts_pmjay=hospital.get("accepts_pmjay", False),
        budget_min=request.budget_min,
        budget_max=request.budget_max,
    )

    # ── Weighted Overall Score ────────────────────────────────────────────────
    overall = (
        clinical * settings.CLINICAL_WEIGHT
        + reputation * settings.REPUTATION_WEIGHT
        + accessibility * settings.ACCESSIBILITY_WEIGHT
        + affordability * settings.AFFORDABILITY_WEIGHT
    )

    # ── Build cost range for this hospital/tier ───────────────────────────────
    tier_ranges = {
        "budget": (80_000, 250_000),
        "mid": (250_000, 600_000),
        "premium": (600_000, 1_500_000),
    }
    cost_min, cost_max = tier_ranges.get(tier, (150_000, 500_000))

    logger.debug(
        "Hospital scored",
        name=hospital.get("name"),
        clinical=clinical,
        reputation=reputation,
        accessibility=accessibility,
        affordability=affordability,
        overall=round(overall, 1),
    )

    return HospitalCard(
        id=hospital.get("id", str(uuid.uuid4())),
        name=hospital.get("name", "Unknown Hospital"),
        address=hospital.get("address", ""),
        city=hospital.get("city", ""),
        state=hospital.get("state", ""),
        distance_km=round(distance_km, 1),
        # Support both 'google_rating' (synthetic data) and 'rating' keys
        rating=hospital.get("google_rating") or hospital.get("rating", 0.0),
        review_count=hospital.get("review_count", 0),
        accreditation=accreditations,
        hospital_type=hospital.get("hospital_type", "private"),
        tier=tier,
        specializations=specializations,
        procedures_offered=hospital.get("procedures_offered", []),
        total_beds=hospital.get("total_beds"),
        icu_beds=hospital.get("icu_beds"),
        emergency_services=hospital.get("emergency_services", False),
        score_breakdown=ScoreBreakdown(
            clinical=round(clinical, 1),
            reputation=round(reputation, 1),
            accessibility=round(accessibility, 1),
            affordability=round(affordability, 1),
            overall=round(overall, 1),
        ),
        cost_range=CostRange(min_amount=cost_min, max_amount=cost_max),
        accepts_pmjay=hospital.get("accepts_pmjay", False),
        phone=hospital.get("phone"),
        website=hospital.get("website"),
        rank=0,  # Will be set by rank_hospitals after sorting
    )


def rank_hospitals(
    hospitals: List[Dict[str, Any]],
    intent: ParsedIntent,
    request: SearchRequest,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    max_results: int = 10,
) -> List[HospitalCard]:
    """
    Score and rank a list of hospital dicts.
    Returns top `max_results` sorted by overall score descending.
    """
    if not hospitals:
        return []

    scored: List[HospitalCard] = []
    for hospital in hospitals:
        # Compute distance
        if user_lat and user_lng and hospital.get("lat") and hospital.get("lng"):
            distance_km = _haversine(user_lat, user_lng, hospital["lat"], hospital["lng"])
        else:
            distance_km = hospital.get("distance_km", 10.0)

        # Filter by radius
        if distance_km > request.radius_km:
            continue

        # Filter by hospital type
        if request.hospital_type and request.hospital_type != "both":
            if hospital.get("hospital_type", "").lower() != request.hospital_type.lower():
                continue

        card = score_hospital(hospital, intent, request, distance_km)
        scored.append(card)

    # Sort by overall score descending
    scored.sort(key=lambda h: h.score_breakdown.overall, reverse=True)
    # Assign rank (1-based)
    for idx, card in enumerate(scored, start=1):
        card.rank = idx
    return scored[:max_results]


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two lat/lng points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
