"""
HealthAssist — Real-World Dataset Loader
========================================
Loads 4 seed Excel files at module import time (once per server lifetime):

  • hospital_dataset_1500_rows.xlsx  → REAL_HOSPITALS  (1 500 records)
  • doctors_realistic.xlsx           → DOCTOR_INDEX    (500 records)
  • diseases_realistic.xlsx          → DISEASE_PROCEDURE_MAP
  • reviews_realistic.xlsx           → HOSPITAL_SENTIMENT (aggregated)

Field normalisation is applied so every hospital dict matches the shape
expected by scoring_engine.score_hospital() and the HospitalCard schema.
"""

from __future__ import annotations

import math
import os
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List

import structlog

logger = structlog.get_logger(__name__)

SEEDS_DIR = Path(__file__).parent / "seeds"

# ── Public exports ─────────────────────────────────────────────────────────────
REAL_HOSPITALS: List[Dict[str, Any]] = []
DOCTOR_INDEX: Dict[str, List[Dict[str, Any]]] = defaultdict(list)   # hospital_id → doctors
DISEASE_PROCEDURE_MAP: Dict[str, List[str]] = defaultdict(list)     # disease_name → procedures
HOSPITAL_SENTIMENT: Dict[str, float] = {}                            # hospital_id → avg_sentiment


# ── Internal helpers ───────────────────────────────────────────────────────────

def _safe_float(val: Any, default: float = 0.0) -> float:
    try:
        f = float(val)
        return default if math.isnan(f) else f
    except (TypeError, ValueError):
        return default


def _safe_int(val: Any, default: int = 0) -> int:
    try:
        return int(float(val))
    except (TypeError, ValueError):
        return default


def _normalise_tier(raw: str) -> str:
    """Map 'Tier 1/2/3' → 'premium/mid/budget'."""
    mapping = {"tier 1": "premium", "tier 2": "mid", "tier 3": "budget"}
    return mapping.get(str(raw).strip().lower(), "mid")


def _normalise_bool(val: Any) -> bool:
    """Convert 'Yes'/'No'/True/False/1/0 → Python bool."""
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in {"yes", "true", "1"}


def _normalise_accreditation(val: Any) -> List[str]:
    """'NABH' → ['NABH'], 'JCI' → ['JCI'], NaN → []."""
    s = str(val).strip()
    if s.lower() in {"nan", "none", "", "n/a"}:
        return []
    # Could be comma-separated
    return [a.strip().upper() for a in s.split(",") if a.strip()]


def _normalise_type(val: Any) -> str:
    raw = str(val).strip().lower()
    if raw in {"government", "govt", "public"}:
        return "government"
    if raw in {"trust", "ngo", "charitable"}:
        return "trust"
    return "private"


# ── Loaders ────────────────────────────────────────────────────────────────────

def _load_hospitals() -> List[Dict[str, Any]]:
    """Load and normalise hospital_dataset_1500_rows.xlsx."""
    path = SEEDS_DIR / "hospital_dataset_1500_rows.xlsx"
    if not path.exists():
        logger.warning("Hospital seed file not found", path=str(path))
        return []

    try:
        import pandas as pd  # lazy import — pandas not in core deps
        df = pd.read_excel(path, dtype=str)
        df.columns = df.columns.str.strip()
    except Exception as exc:
        logger.error("Failed to load hospital seed", error=str(exc))
        return []

    hospitals: List[Dict[str, Any]] = []
    for _, row in df.iterrows():
        hid = str(row.get("hospital_id", "")).strip()
        hospitals.append({
            # ── Identity ──────────────────────────────────────────────────────
            "id":                f"real-{hid}",
            "hospital_id":       hid,               # keep raw for cross-ref
            "name":              str(row.get("name", "Unknown")).strip(),
            "address":           "",                 # not in dataset
            "city":              str(row.get("city", "")).strip(),
            "state":             str(row.get("state", "")).strip(),
            "pincode":           str(row.get("pincode", "")).strip(),
            # ── Geo ───────────────────────────────────────────────────────────
            "lat":               _safe_float(row.get("lat")),
            "lng":               _safe_float(row.get("lng")),
            # ── Classification ────────────────────────────────────────────────
            "hospital_type":     _normalise_type(row.get("hospital_type", "private")),
            "tier":              _normalise_tier(row.get("tier", "Tier 2")),
            "accreditation":     _normalise_accreditation(row.get("accreditation", "")),
            # ── Capacity ──────────────────────────────────────────────────────
            "total_beds":        _safe_int(row.get("total_beds")),
            "icu_beds":          _safe_int(row.get("icu_beds")),
            # ── Quality signals ───────────────────────────────────────────────
            "google_rating":     _safe_float(row.get("google_rating")),
            "review_count":      _safe_int(row.get("review_count")),
            "sentiment_score":   0.0,               # filled after reviews loaded
            # ── Empanelment ───────────────────────────────────────────────────
            "accepts_pmjay":     _normalise_bool(row.get("accepts_pmjay", "No")),
            "empanelled_cghs":   _normalise_bool(row.get("empanelled_cghs", "No")),
            "emergency_services": _normalise_bool(row.get("emergency_services", "No")),
            # ── Contact ───────────────────────────────────────────────────────
            "phone":             str(row.get("phone", "")).strip() or None,
            "website":           str(row.get("website", "")).strip() or None,
            # ── Enriched later ────────────────────────────────────────────────
            "specializations":   [],
            "procedures_offered": [],
            "doctors":           [],
        })

    logger.info("Hospital seed loaded", count=len(hospitals))
    return hospitals


def _load_doctors() -> Dict[str, List[Dict[str, Any]]]:
    """Load doctors and index by hospital_id."""
    path = SEEDS_DIR / "doctors_realistic.xlsx"
    if not path.exists():
        logger.warning("Doctors seed file not found")
        return defaultdict(list)

    try:
        import pandas as pd
        df = pd.read_excel(path, dtype=str)
        df.columns = df.columns.str.strip()
    except Exception as exc:
        logger.error("Failed to load doctors seed", error=str(exc))
        return defaultdict(list)

    index: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for _, row in df.iterrows():
        hid = str(row.get("hospital_id", "")).strip()
        index[hid].append({
            "doctor_id":        str(row.get("doctor_id", "")).strip(),
            "doctor_name":      str(row.get("doctor_name", "")).strip(),
            "specialization":   str(row.get("specialization", "")).strip(),
            "experience_years": _safe_int(row.get("experience_years")),
            "hospital_id":      hid,
        })

    logger.info("Doctors seed loaded", count=sum(len(v) for v in index.values()))
    return index


def _load_diseases() -> Dict[str, List[str]]:
    """Load disease → procedure mappings."""
    path = SEEDS_DIR / "diseases_realistic.xlsx"
    if not path.exists():
        logger.warning("Diseases seed file not found")
        return defaultdict(list)

    try:
        import pandas as pd
        df = pd.read_excel(path, dtype=str)
        df.columns = df.columns.str.strip()
    except Exception as exc:
        logger.error("Failed to load diseases seed", error=str(exc))
        return defaultdict(list)

    mapping: Dict[str, List[str]] = defaultdict(list)
    for _, row in df.iterrows():
        disease   = str(row.get("disease_name", "")).strip()
        procedure = str(row.get("related_procedure", "")).strip()
        if disease and procedure and procedure not in mapping[disease]:
            mapping[disease].append(procedure)

    logger.info("Disease-to-procedure map loaded", diseases=len(mapping))
    return mapping


def _load_sentiment() -> Dict[str, float]:
    """Aggregate review sentiment per hospital → avg_sentiment."""
    path = SEEDS_DIR / "reviews_realistic.xlsx"
    if not path.exists():
        logger.warning("Reviews seed file not found")
        return {}

    try:
        import pandas as pd
        df = pd.read_excel(path, dtype=str)
        df.columns = df.columns.str.strip()
    except Exception as exc:
        logger.error("Failed to load reviews seed", error=str(exc))
        return {}

    sentiments: Dict[str, List[float]] = defaultdict(list)
    for _, row in df.iterrows():
        hid   = str(row.get("hospital_id", "")).strip()
        score = _safe_float(row.get("sentiment_score"))
        if hid:
            sentiments[hid].append(score)

    result = {hid: round(sum(scores) / len(scores), 3) for hid, scores in sentiments.items()}
    logger.info("Review sentiments aggregated", hospitals=len(result))
    return result


# ── Enrichment ─────────────────────────────────────────────────────────────────

def _enrich_hospitals(
    hospitals: List[Dict[str, Any]],
    doctor_index: Dict[str, List[Dict[str, Any]]],
    sentiment: Dict[str, float],
) -> None:
    """
    In-place enrichment:
    - Attach doctors list from doctor_index
    - Derive specializations from linked doctors
    - Patch sentiment_score from reviews
    """
    for h in hospitals:
        raw_id = h["hospital_id"]
        doctors = doctor_index.get(raw_id, [])
        h["doctors"] = doctors
        # Derive unique specializations from doctors
        specs = list({d["specialization"] for d in doctors if d["specialization"]})
        h["specializations"] = specs
        # Patch sentiment
        h["sentiment_score"] = sentiment.get(raw_id, 0.0)


# ── Bootstrap (runs once at import time) ──────────────────────────────────────

def _bootstrap() -> None:
    global REAL_HOSPITALS, DOCTOR_INDEX, DISEASE_PROCEDURE_MAP, HOSPITAL_SENTIMENT

    try:
        DOCTOR_INDEX       = _load_doctors()
        HOSPITAL_SENTIMENT = _load_sentiment()
        DISEASE_PROCEDURE_MAP = _load_diseases()
        REAL_HOSPITALS     = _load_hospitals()
        _enrich_hospitals(REAL_HOSPITALS, DOCTOR_INDEX, HOSPITAL_SENTIMENT)
        logger.info(
            "DataLoader bootstrap complete",
            hospitals=len(REAL_HOSPITALS),
            doctor_entries=sum(len(v) for v in DOCTOR_INDEX.values()),
            diseases=len(DISEASE_PROCEDURE_MAP),
            hospital_sentiments=len(HOSPITAL_SENTIMENT),
        )
    except Exception as exc:
        logger.error("DataLoader bootstrap failed", error=str(exc))


_bootstrap()
