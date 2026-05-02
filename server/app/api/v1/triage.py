"""HealthAssist API v1 — POST /triage"""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas.drug import TriageRequest, TriageResult
from app.core.nlp.emergency_detector import detect_emergency

router = APIRouter()

TRIAGE_DISCLAIMER = (
    "This triage assessment is for informational guidance only. "
    "It is NOT a medical diagnosis. For any medical emergency, call 112 immediately. "
    "Always consult a qualified doctor for proper evaluation and treatment."
)

URGENT_SYMPTOMS = {
    "high fever", "severe pain", "vomiting blood", "sudden weakness",
    "vision loss", "hearing loss", "severe headache", "swallowing difficulty"
}
SEMI_URGENT_SYMPTOMS = {
    "persistent cough", "dizziness", "mild chest discomfort", "joint pain",
    "moderate pain", "rash with fever"
}
SPECIALIST_MAP = {
    "chest pain": "Cardiologist",
    "joint pain": "Orthopedist",
    "headache": "Neurologist",
    "rash": "Dermatologist",
    "stomach pain": "Gastroenterologist",
    "vision": "Ophthalmologist",
    "breathing": "Pulmonologist",
    "fever": "General Physician",
    "urine": "Urologist / Nephrologist",
}


@router.post(
    "/triage",
    response_model=TriageResult,
    summary="Symptom triage assessment",
    description=(
        "Provides an urgency assessment based on reported symptoms. "
        "NOT a diagnostic tool — always consult a doctor."
    ),
)
async def triage(
    request: Request,
    body: TriageRequest,
) -> TriageResult:
    query = " ".join(body.symptoms)
    is_emergency, matched_kw = detect_emergency(query)

    if is_emergency:
        return TriageResult(
            urgency_level="emergency",
            recommended_action="Call 112 immediately or go to the nearest Emergency Room. Do NOT wait.",
            specialist_type="Emergency Medicine",
            emergency_services=True,
            disclaimer=TRIAGE_DISCLAIMER,
        )

    if body.severity == "severe":
        return TriageResult(
            urgency_level="urgent",
            recommended_action="Visit an emergency or urgent care facility within 1–2 hours.",
            specialist_type="General Physician / Emergency",
            emergency_services=False,
            disclaimer=TRIAGE_DISCLAIMER,
        )

    symptoms_lower = query.lower()
    urgency = "routine"
    recommended_action = "Schedule an appointment with your doctor within 1–2 weeks."

    for sym in URGENT_SYMPTOMS:
        if sym in symptoms_lower:
            urgency = "urgent"
            recommended_action = "Visit a clinic or hospital within 24 hours."
            break

    if urgency == "routine":
        for sym in SEMI_URGENT_SYMPTOMS:
            if sym in symptoms_lower:
                urgency = "semi-urgent"
                recommended_action = "Consult a doctor within 2–3 days."
                break

    specialist = next(
        (spec for keyword, spec in SPECIALIST_MAP.items() if keyword in symptoms_lower),
        "General Physician",
    )

    return TriageResult(
        urgency_level=urgency,
        recommended_action=recommended_action,
        specialist_type=specialist,
        emergency_services=False,
        disclaimer=TRIAGE_DISCLAIMER,
    )
