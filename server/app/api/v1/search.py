"""
HealthAssist API v1 — POST /search
Accepts a natural language health query → NLP → hospital ranking → cost estimate.

Location resolution priority:
  1. City extracted from query text (NLP)
  2. location.pincode if it looks like a city name (non-numeric)
  3. location.pincode if numeric → mapped to city via prefix table
  4. lat/lng provided directly → geo-distance filter
  5. Fallback: return all hospitals ranked by score
"""

from __future__ import annotations

import re
import structlog
from fastapi import APIRouter, Request

from app.schemas.search import SearchRequest, SearchResponse
from app.core.nlp.intent_engine import extract_intent
from app.core.nlp.emergency_detector import detect_emergency, build_emergency_alert
from app.core.ranking.scoring_engine import rank_hospitals
from app.core.cost.estimator import estimate_cost
from app.data.synthetic.cost_benchmarks import get_all_hospitals

router = APIRouter()
logger = structlog.get_logger(__name__)

# Complete city → (canonical_name, state) map matching real dataset
_CITY_ALIAS: dict[str, tuple[str, str]] = {
    "mumbai": ("Mumbai", "Maharashtra"),
    "delhi": ("Delhi", "Delhi"),
    "new delhi": ("Delhi", "Delhi"),
    "bengaluru": ("Bengaluru", "Karnataka"),
    "bangalore": ("Bengaluru", "Karnataka"),
    "hyderabad": ("Hyderabad", "Telangana"),
    "chennai": ("Chennai", "Tamil Nadu"),
    "kolkata": ("Kolkata", "West Bengal"),
    "calcutta": ("Kolkata", "West Bengal"),
    "pune": ("Pune", "Maharashtra"),
    "ahmedabad": ("Ahmedabad", "Gujarat"),
    "jaipur": ("Jaipur", "Rajasthan"),
    "lucknow": ("Lucknow", "Uttar Pradesh"),
    "kochi": ("Kochi", "Kerala"),
    "cochin": ("Kochi", "Kerala"),
    "patna": ("Patna", "Bihar"),
    "bhopal": ("Bhopal", "Madhya Pradesh"),
    "chandigarh": ("Chandigarh", "Punjab"),
    "nagpur": ("Nagpur", "Maharashtra"),
    "surat": ("Surat", "Gujarat"),
}

# Pincode prefix → city (for real 6-digit Indian pincodes)
_PINCODE_PREFIX: dict[str, str] = {
    "110": "Delhi", "400": "Mumbai", "401": "Mumbai",
    "411": "Pune",  "412": "Pune",   "413": "Pune",
    "560": "Bengaluru", "562": "Bengaluru",
    "600": "Chennai",   "602": "Chennai",
    "700": "Kolkata",   "711": "Kolkata",
    "500": "Hyderabad", "501": "Hyderabad",
    "380": "Ahmedabad", "382": "Ahmedabad",
    "302": "Jaipur",    "303": "Jaipur",
    "226": "Lucknow",   "227": "Lucknow",
    "440": "Nagpur",    "441": "Nagpur",
    "682": "Kochi",     "683": "Kochi",
    "800": "Patna",     "801": "Patna",
    "462": "Bhopal",    "464": "Bhopal",
    "160": "Chandigarh",
    "395": "Surat",     "394": "Surat",
}


def _resolve_location(body: SearchRequest, intent_city: str | None) -> tuple[str | None, str | None, float | None, float | None]:
    """
    Returns (city, state, lat, lng) — all may be None.
    Priority: intent city > location.pincode (city name or numeric) > lat/lng
    """
    # 1. City from NLP intent
    if intent_city:
        entry = _CITY_ALIAS.get(intent_city.lower())
        if entry:
            return entry[0], entry[1], None, None
        return intent_city, None, None, None

    if body.location:
        pin = (body.location.pincode or "").strip()

        # 2. City name typed in pincode field (non-numeric or has letters)
        if pin and not re.match(r"^\d{6}$", pin):
            entry = _CITY_ALIAS.get(pin.lower())
            if entry:
                return entry[0], entry[1], None, None
            # Try partial match
            for key, val in _CITY_ALIAS.items():
                if pin.lower() in key or key in pin.lower():
                    return val[0], val[1], None, None
            # Unknown text — return as-is (will try case-insensitive match below)
            return pin, None, None, None

        # 3. Numeric 6-digit pincode → prefix lookup
        if re.match(r"^\d{6}$", pin):
            city = _PINCODE_PREFIX.get(pin[:3]) or _PINCODE_PREFIX.get(pin[:2])
            if city:
                entry = _CITY_ALIAS.get(city.lower())
                state = entry[1] if entry else None
                return city, state, None, None

        # 4. lat/lng
        if body.location.lat and body.location.lng:
            return None, None, body.location.lat, body.location.lng

    return None, None, None, None


def _filter_by_city(hospitals_data: list, city: str) -> list:
    """Case-insensitive city filter."""
    city_l = city.lower()
    filtered = [h for h in hospitals_data if h.get("city", "").lower() == city_l]
    if not filtered:
        # Try contains match (e.g. "Bengaluru" matches "Bangalore")
        filtered = [h for h in hospitals_data if city_l in h.get("city", "").lower()
                    or h.get("city", "").lower() in city_l]
    return filtered


@router.post(
    "/search",
    response_model=SearchResponse,
    summary="Main health query search",
)
async def search(request: Request, body: SearchRequest) -> SearchResponse:
    logger.info("Search request received", query=body.query[:80])

    # ── Step 1: Emergency detection ───────────────────────────────────────────
    is_emergency, matched_kw = detect_emergency(body.query)
    emergency_alert = build_emergency_alert(matched_kw) if is_emergency else None

    # ── Step 2: NLP intent extraction ─────────────────────────────────────────
    intent = await extract_intent(body)
    logger.info("Intent extracted", procedure=intent.procedure_category,
                city=intent.city, confidence=intent.confidence)

    # ── Step 3: Resolve location ──────────────────────────────────────────────
    city, state, user_lat, user_lng = _resolve_location(body, intent.city)
    logger.info("Location resolved", city=city, state=state, has_coords=bool(user_lat))

    # ── Step 4: Filter hospital pool by city/state/geo ───────────────────────
    all_h = get_all_hospitals()

    if city:
        filtered = _filter_by_city(all_h, city)
        hospitals_data = filtered if filtered else all_h   # fallback to all if no match
        logger.info("City filter", city=city, matched=len(hospitals_data))
    elif state:
        hospitals_data = [h for h in all_h if h.get("state", "").lower() == state.lower()]
        hospitals_data = hospitals_data if hospitals_data else all_h
    else:
        hospitals_data = all_h  # no location: rank all

    # Apply accreditation filter
    if body.accreditation_filter:
        acc = body.accreditation_filter.upper()
        filtered_acc = [h for h in hospitals_data
                        if acc in [a.upper() for a in h.get("accreditation", [])]]
        if filtered_acc:
            hospitals_data = filtered_acc

    # Apply hospital_type filter
    if body.hospital_type and body.hospital_type != "both":
        filtered_type = [h for h in hospitals_data
                         if h.get("hospital_type", "").lower() == body.hospital_type.lower()]
        if filtered_type:
            hospitals_data = filtered_type

    # ── Step 5: Rank hospitals ────────────────────────────────────────────────
    # When no lat/lng: disable radius filter by using a very large radius
    effective_radius = body.radius_km if (user_lat and user_lng) else 99_999

    # Patch body radius for ranking engine
    body_patched = body.model_copy(update={"radius_km": effective_radius})

    ranked_hospitals = rank_hospitals(
        hospitals=hospitals_data,
        intent=intent,
        request=body_patched,
        user_lat=user_lat,
        user_lng=user_lng,
        max_results=10,
    )

    logger.info("Ranked hospitals", count=len(ranked_hospitals))

    # ── Step 6: Cost estimation ───────────────────────────────────────────────
    result_city = ranked_hospitals[0].city if ranked_hospitals else (city or "Pune")
    hospital_tier = "mid"
    if ranked_hospitals:
        top = next((h for h in hospitals_data if h.get("id") == ranked_hospitals[0].id), {})
        hospital_tier = top.get("tier", "mid")

    cost_estimate = await estimate_cost(
        procedure_category=intent.procedure_category,
        body_system=intent.body_system,
        hospital_tier=hospital_tier,
        city=result_city,
        patient_age=body.patient_age or 40,
        comorbidities=body.comorbidities,
        room_preference="general",
    )

    pmjay_prompt = any(h.accepts_pmjay for h in ranked_hospitals)
    data_confidence = round(intent.confidence * 0.4 + cost_estimate.confidence * 0.6, 2)

    return SearchResponse(
        parsed_intent=intent,
        hospitals=ranked_hospitals,
        cost_estimate=cost_estimate,
        emergency_alert=emergency_alert,
        pmjay_prompt=pmjay_prompt,
        data_confidence=data_confidence,
    )
