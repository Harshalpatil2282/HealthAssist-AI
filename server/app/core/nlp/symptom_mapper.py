"""
HealthAssist — Symptom to ICD-10 Mapper
Maps symptom text → ICD-10 codes via:
1. Local dictionary lookup (fast, no API cost)
2. Fuzzy matching with rapidfuzz (for typos / synonyms)
3. Falls back to LLM if confidence is low
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple

import structlog
from rapidfuzz import fuzz, process

logger = structlog.get_logger(__name__)


# ── Local ICD-10 Lookup Table ─────────────────────────────────────────────────
# Format: keyword/synonym → (icd10_code, procedure_category, body_system)
ICD10_LOOKUP: Dict[str, Tuple[str, str, str]] = {
    # Cardiac
    "heart attack": ("I21.9", "Coronary Angioplasty / CABG", "cardiovascular"),
    "myocardial infarction": ("I21.9", "Coronary Angioplasty / CABG", "cardiovascular"),
    "chest pain": ("R07.9", "Cardiac Evaluation", "cardiovascular"),
    "angina": ("I20.9", "Cardiac Evaluation", "cardiovascular"),
    "coronary artery disease": ("I25.10", "Coronary Angioplasty / CABG", "cardiovascular"),
    "angioplasty": ("I25.10", "Coronary Angioplasty", "cardiovascular"),
    "bypass surgery": ("I25.10", "CABG - Coronary Artery Bypass", "cardiovascular"),
    "heart failure": ("I50.9", "Cardiac Management", "cardiovascular"),
    "arrhythmia": ("I49.9", "Cardiac Electrophysiology", "cardiovascular"),

    # Orthopaedic
    "knee replacement": ("M17.11", "Total Knee Arthroplasty", "musculoskeletal"),
    "knee pain": ("M25.361", "Orthopedic Evaluation", "musculoskeletal"),
    "hip replacement": ("M16.11", "Total Hip Arthroplasty", "musculoskeletal"),
    "fracture": ("S00-T14", "Fracture Management", "musculoskeletal"),
    "back pain": ("M54.5", "Spine Evaluation", "musculoskeletal"),
    "spondylitis": ("M45", "Spine Management", "musculoskeletal"),
    "slipped disc": ("M51.1", "Discectomy / Spine Surgery", "musculoskeletal"),

    # Oncology
    "cancer": ("C80.1", "Oncology Consultation", "oncology"),
    "tumor": ("D49.9", "Oncology Evaluation", "oncology"),
    "chemotherapy": ("Z51.11", "Chemotherapy Administration", "oncology"),
    "breast cancer": ("C50.919", "Breast Oncology", "oncology"),
    "lung cancer": ("C34.90", "Thoracic Oncology", "oncology"),
    "prostate cancer": ("C61", "Urologic Oncology", "oncology"),
    "radiation therapy": ("Z51.0", "Radiotherapy", "oncology"),

    # Neurology
    "stroke": ("I63.9", "Stroke Management", "neurology"),
    "epilepsy": ("G40.909", "Neurology - Epilepsy", "neurology"),
    "seizure": ("G40.909", "Neurology - Epilepsy", "neurology"),
    "parkinson": ("G20", "Neurology - Parkinsonism", "neurology"),
    "migraine": ("G43.909", "Neurology - Headache", "neurology"),

    # Gastroenterology
    "appendix": ("K37", "Appendectomy", "gastroenterology"),
    "appendicitis": ("K37", "Appendectomy", "gastroenterology"),
    "gallstone": ("K80.20", "Laparoscopic Cholecystectomy", "gastroenterology"),
    "hernia": ("K46.9", "Hernia Repair", "gastroenterology"),
    "liver cirrhosis": ("K74.60", "Hepatology Management", "gastroenterology"),

    # Nephrology / Urology
    "kidney stone": ("N20.0", "Ureteroscopy / PCNL", "nephrology"),
    "dialysis": ("Z99.2", "Renal Dialysis", "nephrology"),
    "kidney failure": ("N17.9", "Nephrology Management", "nephrology"),

    # Obstetrics / Gynaecology
    "c-section": ("O82", "Caesarean Section", "obstetrics"),
    "caesarean": ("O82", "Caesarean Section", "obstetrics"),
    "normal delivery": ("O80", "Normal Vaginal Delivery", "obstetrics"),
    "hysterectomy": ("N81.4", "Hysterectomy", "gynaecology"),

    # Ophthalmology
    "cataract": ("H26.9", "Cataract Surgery (Phacoemulsification)", "ophthalmology"),
    "lasik": ("H52.7", "LASIK Eye Surgery", "ophthalmology"),
    "glaucoma": ("H40.9", "Glaucoma Management", "ophthalmology"),

    # ENT
    "tonsillitis": ("J35.01", "Tonsillectomy", "ENT"),
    "hearing loss": ("H91.90", "ENT - Audiometry", "ENT"),
    "sinusitis": ("J32.9", "Sinus Surgery (FESS)", "ENT"),

    # Diabetes / Endocrinology
    "diabetes": ("E11.9", "Diabetes Management", "endocrinology"),
    "thyroid": ("E07.9", "Thyroid Management", "endocrinology"),
    "hypothyroidism": ("E03.9", "Thyroid Management", "endocrinology"),
}


def map_symptoms_to_icd10(
    query_text: str, top_n: int = 3
) -> List[Tuple[str, str, str, float]]:
    """
    Map a query string to ICD-10 codes using local lookup + fuzzy match.
    
    Returns list of (icd10_code, procedure_category, body_system, confidence)
    sorted by confidence descending.
    """
    query_lower = query_text.lower()
    results: List[Tuple[str, str, str, float]] = []

    # 1. Exact substring match (highest confidence)
    for keyword, (code, category, system) in ICD10_LOOKUP.items():
        if keyword in query_lower:
            results.append((code, category, system, 0.95))

    if results:
        return sorted(results, key=lambda x: x[3], reverse=True)[:top_n]

    # 2. Fuzzy match against all keywords
    keys = list(ICD10_LOOKUP.keys())
    fuzzy_results = process.extract(query_lower, keys, scorer=fuzz.partial_ratio, limit=top_n)

    for match_text, score, _ in fuzzy_results:
        if score >= 60:
            code, category, system = ICD10_LOOKUP[match_text]
            # Normalize score to 0.5–0.85 range for fuzzy
            confidence = 0.5 + (score - 60) / 100
            results.append((code, category, system, round(confidence, 2)))

    return sorted(results, key=lambda x: x[3], reverse=True)[:top_n]


def get_best_icd10(query_text: str) -> Optional[Tuple[str, str, str, float]]:
    """Returns the single best ICD-10 match or None."""
    results = map_symptoms_to_icd10(query_text, top_n=1)
    return results[0] if results else None
