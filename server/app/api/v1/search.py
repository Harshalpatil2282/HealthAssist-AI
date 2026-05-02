"""
HealthAssist API v1 — POST /search
Location resolution:
  1. City from NLP query text
  2. location.pincode as city name (non-numeric)
  3. location.pincode as 6-digit number → real AllIndiaPinCode lookup → district → canonical city
  4. lat/lng → geo-distance filter
  5. Fallback: all hospitals ranked by score
"""
from __future__ import annotations

import csv, re, structlog
from functools import lru_cache
from pathlib import Path
from fastapi import APIRouter, Request

from app.schemas.search import SearchRequest, SearchResponse
from app.core.nlp.intent_engine import extract_intent
from app.core.nlp.emergency_detector import detect_emergency, build_emergency_alert
from app.core.ranking.scoring_engine import rank_hospitals
from app.core.cost.estimator import estimate_cost
from app.data.synthetic.cost_benchmarks import get_all_hospitals

router = APIRouter()
logger = structlog.get_logger(__name__)

# ── Canonical city → (canonical_name, state) ─────────────────────────────────
_CITY_ALIAS: dict[str, tuple[str, str]] = {
    "mumbai": ("Mumbai", "Maharashtra"),
    "delhi": ("Delhi", "Delhi"),
    "new delhi": ("Delhi", "Delhi"),
    "bengaluru": ("Bangalore", "Karnataka"),
    "bangalore": ("Bangalore", "Karnataka"),
    "bengaluru urban": ("Bangalore", "Karnataka"),
    "bengaluru rural": ("Bangalore", "Karnataka"),
    "hyderabad": ("Hyderabad", "Telangana"),
    "chennai": ("Chennai", "Tamil Nadu"),
    "madras": ("Chennai", "Tamil Nadu"),
    "kolkata": ("Kolkata", "West Bengal"),
    "calcutta": ("Kolkata", "West Bengal"),
    "pune": ("Pune", "Maharashtra"),
    "ahmedabad": ("Ahmedabad", "Gujarat"),
    "jaipur": ("Jaipur", "Rajasthan"),
    "lucknow": ("Lucknow", "Uttar Pradesh"),
    "kochi": ("Kochi", "Kerala"),
    "cochin": ("Kochi", "Kerala"),
    "ernakulam": ("Kochi", "Kerala"),           # district name in pincode DB
    "patna": ("Patna", "Bihar"),
    "bhopal": ("Bhopal", "Madhya Pradesh"),
    "chandigarh": ("Chandigarh", "Punjab"),
    "nagpur": ("Nagpur", "Maharashtra"),
    "surat": ("Surat", "Gujarat"),
    # Expanded metro aliases from AllIndiaPinCode district names
    "south delhi": ("Delhi", "Delhi"),
    "north delhi": ("Delhi", "Delhi"),
    "east delhi": ("Delhi", "Delhi"),
    "west delhi": ("Delhi", "Delhi"),
    "central delhi": ("Delhi", "Delhi"),
    "new delhi district": ("Delhi", "Delhi"),
    "mumbai suburban": ("Mumbai", "Maharashtra"),
    "mumbai city": ("Mumbai", "Maharashtra"),
    "thane": ("Mumbai", "Maharashtra"),
    "pune district": ("Pune", "Maharashtra"),
    "chennai district": ("Chennai", "Tamil Nadu"),
    "kolkata district": ("Kolkata", "West Bengal"),
    "jaipur district": ("Jaipur", "Rajasthan"),
    "ahmedabad district": ("Ahmedabad", "Gujarat"),
    "lucknow district": ("Lucknow", "Uttar Pradesh"),
    "hyderabad district": ("Hyderabad", "Telangana"),
    "patna district": ("Patna", "Bihar"),
    "nagpur district": ("Nagpur", "Maharashtra"),
    "bhopal district": ("Bhopal", "Madhya Pradesh"),
    "chandigarh district": ("Chandigarh", "Punjab"),
}

_SEEDS_DIR = Path(__file__).parent.parent.parent / "data" / "seeds"


@lru_cache(maxsize=1)
def _load_pincode_map() -> dict[str, str]:
    """
    Load AllIndiaPinCode.xls (actually CSV) → {pincode: canonical_city}.
    Cached in memory after first call.
    """
    path = _SEEDS_DIR / "AllIndiaPinCode.xls"
    mapping: dict[str, str] = {}
    if not path.exists():
        logger.warning("AllIndiaPinCode file not found, using prefix fallback")
        return mapping
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                pin = str(row.get("pincode", "")).strip().zfill(6)
                district = row.get("district", "").strip().strip('"').lower()
                if not pin or pin == "000000" or not district:
                    continue
                if pin not in mapping:  # first occurrence wins (head office)
                    # Map district → canonical city
                    canon = _CITY_ALIAS.get(district)
                    if canon:
                        mapping[pin] = canon[0]
                    else:
                        # Try partial match
                        for alias, (city, _) in _CITY_ALIAS.items():
                            if alias in district or district in alias:
                                mapping[pin] = city
                                break
        logger.info("Pincode map loaded", count=len(mapping))
    except Exception as e:
        logger.error("Failed to load pincode map", error=str(e))
    return mapping


def _pincode_to_city(pincode: str) -> str | None:
    """Resolve a 6-digit pincode to canonical city name."""
    mapping = _load_pincode_map()
    city = mapping.get(pincode)
    if city:
        return city
    # Fallback: prefix table for the 15 hospital cities
    PREFIX = {
        "110": "Delhi",    "400": "Mumbai",   "401": "Mumbai",
        "411": "Pune",     "412": "Pune",     "413": "Pune",
        "560": "Bengaluru","562": "Bengaluru","563": "Bengaluru",
        "600": "Chennai",  "601": "Chennai",  "602": "Chennai",
        "700": "Kolkata",  "711": "Kolkata",  "712": "Kolkata",
        "500": "Hyderabad","501": "Hyderabad","502": "Hyderabad",
        "380": "Ahmedabad","382": "Ahmedabad","383": "Ahmedabad",
        "302": "Jaipur",   "303": "Jaipur",   "304": "Jaipur",
        "226": "Lucknow",  "227": "Lucknow",  "228": "Lucknow",
        "440": "Nagpur",   "441": "Nagpur",   "442": "Nagpur",
        "682": "Kochi",    "683": "Kochi",    "686": "Kochi",
        "800": "Patna",    "801": "Patna",    "803": "Patna",
        "462": "Bhopal",   "464": "Bhopal",   "466": "Bhopal",
        "160": "Chandigarh","161": "Chandigarh",
        "395": "Surat",    "394": "Surat",
    }
    return PREFIX.get(pincode[:3]) or PREFIX.get(pincode[:2])


def _resolve_location(body: SearchRequest, intent_city: str | None) -> tuple:
    """Returns (city, state, lat, lng)."""
    # 1. NLP-extracted city
    if intent_city:
        entry = _CITY_ALIAS.get(intent_city.lower())
        if entry:
            return entry[0], entry[1], None, None
        return intent_city, None, None, None

    if body.location:
        pin = (body.location.pincode or "").strip()

        # 2. City name typed in the field (non-numeric)
        if pin and not re.match(r"^\d{6}$", pin):
            entry = _CITY_ALIAS.get(pin.lower())
            if entry:
                return entry[0], entry[1], None, None
            for key, val in _CITY_ALIAS.items():
                if pin.lower() in key or key in pin.lower():
                    return val[0], val[1], None, None
            return pin.title(), None, None, None

        # 3. 6-digit numeric pincode → full lookup
        if re.match(r"^\d{6}$", pin):
            city = _pincode_to_city(pin)
            if city:
                entry = _CITY_ALIAS.get(city.lower())
                state = entry[1] if entry else None
                logger.info("Pincode resolved", pincode=pin, city=city)
                return city, state, None, None
            logger.warning("Pincode not mapped", pincode=pin)

        # 4. GPS
        if body.location.lat and body.location.lng:
            return None, None, body.location.lat, body.location.lng

    return None, None, None, None


def _filter_by_city(hospitals_data: list, city: str) -> list:
    city_l = city.lower()
    filtered = [h for h in hospitals_data if h.get("city", "").lower() == city_l]
    if not filtered:
        # Fuzzy: bengaluru <-> bangalore
        filtered = [h for h in hospitals_data if
                    city_l in h.get("city", "").lower() or h.get("city", "").lower() in city_l]
    return filtered


@router.post("/search", response_model=SearchResponse, summary="Main health query search")
async def search(request: Request, body: SearchRequest) -> SearchResponse:
    logger.info("Search request received", query=body.query[:80])

    is_emergency, matched_kw = detect_emergency(body.query)
    emergency_alert = build_emergency_alert(matched_kw) if is_emergency else None

    intent = await extract_intent(body)
    logger.info("Intent extracted", procedure=intent.procedure_category,
                city=intent.city, confidence=intent.confidence)

    city, state, user_lat, user_lng = _resolve_location(body, intent.city)
    logger.info("Location resolved", city=city, state=state)

    all_h = get_all_hospitals()

    if city:
        filtered = _filter_by_city(all_h, city)
        hospitals_data = filtered if filtered else all_h
        logger.info("City filter applied", city=city, matched=len(hospitals_data))
    elif state:
        hospitals_data = [h for h in all_h if h.get("state", "").lower() == state.lower()]
        hospitals_data = hospitals_data or all_h
    else:
        hospitals_data = all_h

    if body.accreditation_filter:
        acc = body.accreditation_filter.upper()
        fa = [h for h in hospitals_data if acc in [a.upper() for a in h.get("accreditation", [])]]
        if fa:
            hospitals_data = fa

    if body.hospital_type and body.hospital_type != "both":
        ft = [h for h in hospitals_data if h.get("hospital_type", "").lower() == body.hospital_type.lower()]
        if ft:
            hospitals_data = ft

    effective_radius = body.radius_km if (user_lat and user_lng) else 99_999
    body_patched = body.model_copy(update={"radius_km": effective_radius})

    ranked_hospitals = rank_hospitals(
        hospitals=hospitals_data, intent=intent,
        request=body_patched, user_lat=user_lat, user_lng=user_lng, max_results=10,
    )
    logger.info("Ranked hospitals", count=len(ranked_hospitals))

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
        parsed_intent=intent, hospitals=ranked_hospitals,
        cost_estimate=cost_estimate, emergency_alert=emergency_alert,
        pmjay_prompt=pmjay_prompt, data_confidence=data_confidence,
    )
