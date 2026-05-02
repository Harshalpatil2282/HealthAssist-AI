"""
HealthAssist — Risk Adjuster
Applies comorbidity and age multipliers to cost estimates.
"""

from __future__ import annotations

from typing import List, Tuple

# Comorbidity risk multipliers
COMORBIDITY_MULTIPLIERS = {
    "diabetes": 1.30,           # +30% infection risk
    "hypertension": 1.20,       # +20% cardiovascular risk
    "cardiac": 1.50,            # +50% ICU probability
    "cardiac history": 1.50,
    "heart disease": 1.50,
    "obesity": 1.25,            # +25% surgical complexity
    "kidney disease": 1.35,     # +35% complication risk
    "renal failure": 1.35,
    "liver disease": 1.30,
    "copd": 1.25,
    "asthma": 1.15,
    "cancer": 1.40,
    "immunocompromised": 1.40,
    "hiv": 1.35,
    "blood disorder": 1.30,
    "coagulation disorder": 1.35,
}

# Age multipliers
AGE_MULTIPLIERS = {
    (0, 39): 1.00,
    (40, 60): 1.20,
    (61, 120): 1.40,
}


def get_age_multiplier(age: int) -> float:
    for (low, high), mult in AGE_MULTIPLIERS.items():
        if low <= age <= high:
            return mult
    return 1.20  # default


def get_comorbidity_multiplier(comorbidities: List[str]) -> Tuple[float, List[str]]:
    """
    Returns (combined_multiplier, matched_conditions).
    Multipliers stack additively beyond 1.0 (not multiplicatively) to avoid runaway inflation.
    e.g., diabetes(1.30) + hypertension(1.20) → 1.50 not 1.56
    """
    matched = []
    extra_risk = 0.0

    for comorb in comorbidities:
        comorb_lower = comorb.strip().lower()
        for key, mult in COMORBIDITY_MULTIPLIERS.items():
            if key in comorb_lower or comorb_lower in key:
                extra_risk += (mult - 1.0)
                matched.append(comorb)
                break

    # Cap additive extra risk at 1.0 (200% max multiplier)
    combined = 1.0 + min(extra_risk, 1.0)
    return round(combined, 2), matched


def apply_risk_adjustment(
    base_min: int,
    base_max: int,
    comorbidities: List[str],
    patient_age: int = 40,
) -> Tuple[int, int, float, List[str], List[str]]:
    """
    Apply comorbidity + age adjustments to cost base.
    Returns (adj_min, adj_max, total_multiplier, matched_conditions, risk_flags)
    """
    comorb_mult, matched = get_comorbidity_multiplier(comorbidities)
    age_mult = get_age_multiplier(patient_age)
    total_mult = round(comorb_mult * age_mult, 2)

    adj_min = int(base_min * total_mult)
    adj_max = int(base_max * total_mult)

    # Build human-readable risk flags
    risk_flags = []
    if matched:
        risk_flags.append(
            f"Comorbidities ({', '.join(matched)}) may increase cost by "
            f"{int((comorb_mult - 1) * 100)}%"
        )
    if patient_age >= 60:
        risk_flags.append(
            f"Patient age ({patient_age}) may increase cost by "
            f"{int((age_mult - 1) * 100)}% due to higher complexity"
        )

    return adj_min, adj_max, total_mult, matched, risk_flags
