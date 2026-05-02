"""
HealthAssist — PMJAY Eligibility Checker
Rule-based engine implementing simplified PMJAY/Ayushman Bharat eligibility rules.

IMPORTANT: This is indicative only. Always redirect to pmjay.gov.in for official check.
Coverage: ₹5,00,000 per family per year | 1,949+ procedure packages.
"""

from __future__ import annotations

from typing import List

import structlog

from app.schemas.pmjay import PMJAYCheckRequest, PMJAYResult

logger = structlog.get_logger(__name__)

PMJAY_DISCLAIMER = (
    "This is an indicative eligibility check only, not an official determination. "
    "PMJAY eligibility is subject to SECC 2011 database inclusion and state-specific rules. "
    "Please verify your eligibility at pmjay.gov.in or call the PMJAY helpline at 14555."
)

# States with expanded coverage beyond standard PMJAY
EXPANDED_COVERAGE_STATES = {
    "andhra pradesh", "gujarat", "karnataka", "kerala",
    "madhya pradesh", "rajasthan", "tamil nadu", "telangana",
    "uttarakhand", "west bengal", "chhattisgarh", "jharkhand"
}

# Income thresholds by state (simplified — actual rules vary)
STATE_INCOME_THRESHOLDS = {
    "default": 250_000,  # ₹2.5L
    "delhi": 300_000,
    "maharashtra": 250_000,
    "karnataka": 250_000,
}


def check_eligibility(request: PMJAYCheckRequest) -> PMJAYResult:
    """
    Evaluate PMJAY eligibility based on ration card, income, and state.
    Returns PMJAYResult with indicative eligibility and next steps.
    """
    state_lower = request.state.strip().lower()
    ration_card = request.ration_card_type.upper()
    income = request.annual_income

    likely_eligible = False
    reasons: List[str] = []
    next_steps: List[str] = []

    # ── Rule 1: BPL / AAY ration card holders → likely eligible ──────────────
    if ration_card in ("BPL", "AAY"):
        likely_eligible = True
        reasons.append(f"You hold a {ration_card} ration card, which indicates eligibility")

    # ── Rule 2: Income threshold ──────────────────────────────────────────────
    threshold = STATE_INCOME_THRESHOLDS.get(state_lower, STATE_INCOME_THRESHOLDS["default"])
    if income <= threshold:
        if not likely_eligible:
            likely_eligible = True
        reasons.append(
            f"Annual family income (₹{income:,}) is within the indicative threshold of ₹{threshold:,}"
        )
    elif not likely_eligible:
        reasons.append(
            f"Annual family income (₹{income:,}) exceeds the indicative threshold of ₹{threshold:,}"
        )

    # ── Rule 3: APL with large family ─────────────────────────────────────────
    if ration_card == "APL" and request.family_size >= 5 and income <= 300_000:
        likely_eligible = True
        reasons.append(
            f"Large family ({request.family_size} members) with APL card may qualify under state scheme"
        )

    # ── Rule 4: Expanded state coverage ──────────────────────────────────────
    is_expanded_state = state_lower in EXPANDED_COVERAGE_STATES
    if is_expanded_state and not likely_eligible:
        reasons.append(
            f"{request.state} has an expanded state health scheme that may cover you"
        )

    # ── Build eligibility reason string ──────────────────────────────────────
    eligibility_reason = "; ".join(reasons) if reasons else "Based on the information provided, eligibility could not be determined"

    # ── Build next steps ──────────────────────────────────────────────────────
    if likely_eligible:
        next_steps = [
            "Visit pmjay.gov.in to verify your official eligibility using your Aadhaar number",
            "Call PMJAY helpline at 14555 for assistance",
            "Visit your nearest Common Service Centre (CSC) with Aadhaar card and ration card",
            "Ask the hospital's PMJAY desk to check your eligibility at the time of admission",
        ]
    else:
        next_steps = [
            "Verify on pmjay.gov.in — eligibility may depend on SECC 2011 database inclusion",
            "Check if your state has its own health scheme (e.g., MA Yojana, Aarogyasri)",
            "Call PMJAY helpline at 14555 to discuss your specific situation",
            "Consult a Jan Seva Kendra for help with application",
        ]

    logger.info(
        "PMJAY check completed",
        likely_eligible=likely_eligible,
        ration_card=ration_card,
        state=request.state,
        income=income,
    )

    return PMJAYResult(
        likely_eligible=likely_eligible,
        eligibility_reason=eligibility_reason,
        coverage_amount=500_000 if likely_eligible else None,
        procedures_covered=1949,
        next_steps=next_steps,
        official_portal="https://pmjay.gov.in",
        helpline="14555",
        disclaimer=PMJAY_DISCLAIMER,
    )
