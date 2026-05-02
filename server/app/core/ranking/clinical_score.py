"""
HealthAssist — Clinical Score Calculator
Inputs: hospital specializations vs. procedure ICD-10 body system
"""

from __future__ import annotations

from typing import List, Optional


# ── Specialization → Body System mapping ──────────────────────────────────────
SPECIALIZATION_BODY_SYSTEM_MAP = {
    "cardiology": "cardiovascular",
    "cardiac surgery": "cardiovascular",
    "interventional cardiology": "cardiovascular",
    "cath lab": "cardiovascular",
    "orthopedics": "musculoskeletal",
    "orthopaedics": "musculoskeletal",
    "joint replacement": "musculoskeletal",
    "spine surgery": "musculoskeletal",
    "neurology": "neurology",
    "neurosurgery": "neurology",
    "oncology": "oncology",
    "cancer care": "oncology",
    "radiation oncology": "oncology",
    "medical oncology": "oncology",
    "gastroenterology": "gastroenterology",
    "gastrointestinal surgery": "gastroenterology",
    "nephrology": "nephrology",
    "urology": "nephrology",
    "dialysis": "nephrology",
    "obstetrics": "obstetrics",
    "gynaecology": "obstetrics",
    "maternity": "obstetrics",
    "ophthalmology": "ophthalmology",
    "eye care": "ophthalmology",
    "ent": "ENT",
    "ear nose throat": "ENT",
    "endocrinology": "endocrinology",
    "diabetology": "endocrinology",
    "pulmonology": "pulmonology",
    "respiratory": "pulmonology",
    "dermatology": "dermatology",
    "psychiatry": "psychiatry",
    "general surgery": "general",
    "general medicine": "general",
}


def calculate_clinical_score(
    hospital_specializations: List[str],
    target_body_system: Optional[str],
    procedure_category: Optional[str],
    icu_available: bool = False,
    nabh_accredited: bool = False,
    jci_accredited: bool = False,
) -> float:
    """
    Score 0–100 based on clinical capability match.
    
    Components:
    - Specialization match: 0–60 pts
    - ICU availability: +15 pts
    - NABH accreditation: +15 pts
    - JCI accreditation: +10 pts
    """
    score = 0.0

    # ── Specialization match ──────────────────────────────────────────────────
    if target_body_system and hospital_specializations:
        spec_lower = [s.lower() for s in hospital_specializations]
        best_match = 0.0

        for spec in spec_lower:
            mapped_system = SPECIALIZATION_BODY_SYSTEM_MAP.get(spec, spec)
            if mapped_system == target_body_system.lower():
                best_match = 60.0
                break
            elif target_body_system.lower() in mapped_system or mapped_system in target_body_system.lower():
                best_match = max(best_match, 40.0)

        score += best_match

        # Partial credit for general hospitals
        if best_match == 0 and "general surgery" in spec_lower:
            score += 20.0
    else:
        # No target system specified — give base score
        score += 30.0

    # ── Bonuses ───────────────────────────────────────────────────────────────
    if icu_available:
        score += 15.0
    if nabh_accredited:
        score += 15.0
    if jci_accredited:
        score += 10.0

    return min(100.0, round(score, 1))
