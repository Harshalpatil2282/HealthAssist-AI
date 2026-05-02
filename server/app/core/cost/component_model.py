"""
HealthAssist — 5-Component Cost Model
Breaks down total cost into: procedure, stay, medications, diagnostics, contingency.
All amounts in INR.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

from app.schemas.search import CostComponent


# ── CGHS Base Rates by Procedure Category (INR, Tier-2 city base) ─────────────
# Source: CGHS 2022 Rate Schedule + PMJAY Package Rates (synthetic calibration)
PROCEDURE_BASE_RATES: Dict[str, Tuple[int, int]] = {
    # Cardiac
    "coronary angioplasty": (150_000, 250_000),
    "cabg - coronary artery bypass": (250_000, 400_000),
    "cardiac evaluation": (10_000, 30_000),
    "cardiac management": (30_000, 80_000),
    "cardiac electrophysiology": (80_000, 200_000),

    # Orthopaedic
    "total knee arthroplasty": (150_000, 280_000),
    "total hip arthroplasty": (160_000, 300_000),
    "fracture management": (30_000, 100_000),
    "spine evaluation": (10_000, 25_000),
    "discectomy / spine surgery": (80_000, 200_000),

    # Oncology
    "chemotherapy administration": (15_000, 50_000),  # per cycle
    "radiotherapy": (80_000, 200_000),
    "oncology consultation": (5_000, 15_000),
    "breast oncology": (100_000, 300_000),
    "thoracic oncology": (150_000, 400_000),
    "urologic oncology": (100_000, 350_000),

    # Neurology
    "stroke management": (50_000, 150_000),
    "neurology - epilepsy": (15_000, 40_000),
    "neurology - parkinsonism": (20_000, 60_000),
    "neurology - headache": (5_000, 20_000),

    # GI
    "appendectomy": (40_000, 80_000),
    "laparoscopic cholecystectomy": (40_000, 90_000),
    "hernia repair": (30_000, 70_000),
    "hepatology management": (20_000, 60_000),

    # Nephrology
    "ureteroscopy / pcnl": (50_000, 120_000),
    "renal dialysis": (800, 2_000),   # per session
    "nephrology management": (10_000, 30_000),

    # Obstetrics
    "caesarean section": (50_000, 120_000),
    "normal vaginal delivery": (20_000, 60_000),
    "hysterectomy": (60_000, 150_000),

    # Ophthalmology
    "cataract surgery (phacoemulsification)": (15_000, 50_000),
    "lasik eye surgery": (20_000, 60_000),
    "glaucoma management": (10_000, 30_000),

    # ENT
    "tonsillectomy": (20_000, 50_000),
    "sinus surgery (fess)": (30_000, 70_000),

    # Endocrinology
    "diabetes management": (5_000, 20_000),
    "thyroid management": (5_000, 20_000),

    # Default
    "general medical consultation": (2_000, 10_000),
}

# Hospital tier multipliers (applied to base rate)
TIER_MULTIPLIERS: Dict[str, Tuple[float, float]] = {
    "budget": (1.0, 1.5),
    "mid": (1.5, 2.5),
    "premium": (2.5, 4.0),
}

# Expected stay days by procedure category
EXPECTED_STAY_DAYS: Dict[str, Tuple[int, int]] = {
    "coronary angioplasty": (2, 4),
    "cabg - coronary artery bypass": (7, 14),
    "total knee arthroplasty": (4, 7),
    "total hip arthroplasty": (5, 8),
    "appendectomy": (2, 4),
    "laparoscopic cholecystectomy": (1, 3),
    "caesarean section": (4, 7),
    "normal vaginal delivery": (2, 3),
    "stroke management": (7, 21),
    "cataract surgery (phacoemulsification)": (0, 1),
    "hernia repair": (1, 3),
    "default": (2, 5),
}

# Room daily rates (INR, Tier-2 base)
ROOM_RATES: Dict[str, Tuple[int, int]] = {
    "general": (1_500, 3_000),
    "semi_private": (3_000, 6_000),
    "private": (6_000, 12_000),
    "icu": (15_000, 40_000),
}

# Standard diagnostics by body system (INR total)
PRE_OP_DIAGNOSTICS: Dict[str, Tuple[int, int, str]] = {
    "cardiovascular": (8_000, 15_000, "ECG ₹500, Echo ₹3,000, Blood panel ₹2,500, Stress test ₹4,000"),
    "musculoskeletal": (5_000, 10_000, "X-ray ₹500, MRI ₹5,000, Blood panel ₹2,500"),
    "oncology": (10_000, 25_000, "Biopsy ₹8,000, CT Scan ₹6,000, Tumour markers ₹4,000"),
    "neurology": (8_000, 20_000, "MRI Brain ₹6,000, EEG ₹3,000, Blood panel ₹2,500"),
    "gastroenterology": (5_000, 12_000, "Ultrasound ₹2,000, Blood panel ₹2,500, LFT ₹1,500"),
    "nephrology": (4_000, 10_000, "Ultrasound ₹2,000, Renal panel ₹3,000, Urine ₹500"),
    "obstetrics": (5_000, 12_000, "Ultrasound ₹2,000, Blood panel ₹2,500, NST ₹1,500"),
    "ophthalmology": (2_000, 5_000, "Slit lamp ₹1,000, OCT ₹3,000, Biometry ₹2,000"),
    "general": (3_000, 8_000, "Blood panel ₹2,500, ECG ₹500, X-ray ₹500"),
}

# Standard post-op medications cost range (INR)
MEDICATION_COST: Dict[str, Tuple[int, int]] = {
    "cardiovascular": (8_000, 20_000),
    "musculoskeletal": (5_000, 12_000),
    "oncology": (20_000, 60_000),
    "neurology": (5_000, 15_000),
    "gastroenterology": (3_000, 10_000),
    "nephrology": (5_000, 15_000),
    "obstetrics": (3_000, 8_000),
    "ophthalmology": (2_000, 6_000),
    "general": (3_000, 8_000),
}


def build_cost_components(
    procedure_category: str,
    body_system: str,
    hospital_tier: str,
    room_preference: str = "general",
    geo_min_mult: float = 1.0,
    geo_max_mult: float = 1.0,
) -> Tuple[List[CostComponent], bool]:
    """
    Build 5 cost components for a procedure.
    Returns (components, synthetic_data_used).
    """
    proc_key = procedure_category.lower()
    body_key = body_system.lower() if body_system else "general"

    # ── 1. Procedure Cost ─────────────────────────────────────────────────────
    base_min, base_max = PROCEDURE_BASE_RATES.get(proc_key, (50_000, 150_000))
    synthetic = proc_key not in PROCEDURE_BASE_RATES

    tier_min_mult, tier_max_mult = TIER_MULTIPLIERS.get(hospital_tier.lower(), (1.5, 2.5))
    proc_min = int(base_min * tier_min_mult * geo_min_mult)
    proc_max = int(base_max * tier_max_mult * geo_max_mult)

    procedure_component = CostComponent(
        name="Procedure Cost",
        min_amount=proc_min,
        max_amount=proc_max,
        notes=f"Based on CGHS/PMJAY benchmarks × {hospital_tier} tier × location premium",
    )

    # ── 2. Hospital Stay ──────────────────────────────────────────────────────
    stay_min_days, stay_max_days = EXPECTED_STAY_DAYS.get(proc_key, EXPECTED_STAY_DAYS["default"])
    room_min_rate, room_max_rate = ROOM_RATES.get(room_preference, ROOM_RATES["general"])

    stay_min = int(stay_min_days * room_min_rate * geo_min_mult)
    stay_max = int(stay_max_days * room_max_rate * geo_max_mult)

    stay_component = CostComponent(
        name="Hospital Stay",
        min_amount=stay_min,
        max_amount=stay_max,
        notes=f"Expected stay: {stay_min_days}–{stay_max_days} days | Room: {room_preference.replace('_', '-')}",
    )

    # ── 3. Medications ────────────────────────────────────────────────────────
    med_min, med_max = MEDICATION_COST.get(body_key, MEDICATION_COST["general"])
    med_min = int(med_min * geo_min_mult)
    med_max = int(med_max * geo_max_mult)

    med_component = CostComponent(
        name="Medications",
        min_amount=med_min,
        max_amount=med_max,
        notes="Pre-op + post-op medications. Generic alternatives may reduce cost by 40–70%.",
    )

    # ── 4. Diagnostics ────────────────────────────────────────────────────────
    diag_min, diag_max, diag_notes = PRE_OP_DIAGNOSTICS.get(body_key, PRE_OP_DIAGNOSTICS["general"])
    diag_min = int(diag_min * geo_min_mult)
    diag_max = int(diag_max * geo_max_mult)

    diag_component = CostComponent(
        name="Diagnostics",
        min_amount=diag_min,
        max_amount=diag_max,
        notes=f"Pre-op tests: {diag_notes}",
    )

    # ── 5. Contingency Buffer (10% of procedure cost) ─────────────────────────
    contingency_min = int(proc_min * 0.10)
    contingency_max = int(proc_max * 0.10)

    contingency_component = CostComponent(
        name="Contingency Buffer",
        min_amount=contingency_min,
        max_amount=contingency_max,
        notes="10% buffer for unexpected complications, consumables, and administrative fees.",
    )

    return [
        procedure_component,
        stay_component,
        med_component,
        diag_component,
        contingency_component,
    ], synthetic
