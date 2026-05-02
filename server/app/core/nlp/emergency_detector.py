"""
HealthAssist — Emergency Detector
CRITICAL: This runs FIRST, before any LLM call.
Detects red-flag symptoms in English, Hindi, Marathi, Tamil, Telugu.
Recall target: > 0.95
"""

from __future__ import annotations

import re
from typing import List, Tuple

from app.schemas.search import EmergencyAlert

# ── Emergency Keyword Sets ─────────────────────────────────────────────────────
# English
EMERGENCY_KEYWORDS_EN = {
    "chest pain", "chest tightness", "heart attack", "cardiac arrest",
    "stroke", "difficulty breathing", "breathlessness", "can't breathe",
    "cannot breathe", "unconscious", "unresponsive", "passed out",
    "bleeding heavily", "heavy bleeding", "severe bleeding",
    "seizure", "convulsion", "fits", "epileptic",
    "suicide", "suicidal", "kill myself", "end my life",
    "overdose", "drug overdose", "poisoning",
    "choking", "unable to swallow", "throat closing",
    "anaphylaxis", "severe allergic reaction",
    "skull fracture", "spinal injury", "paralysis suddenly",
    "high fever not coming down", "meningitis",
    "ectopic pregnancy", "obstetric emergency",
    "drowning", "electrocution", "burns severe",
}

# Hindi (Devanagari)
EMERGENCY_KEYWORDS_HI = {
    "सीने में दर्द",       # Chest pain
    "दिल का दौरा",         # Heart attack
    "दिल का दर्द",
    "सांस नहीं आ रही",     # Can't breathe
    "सांस लेने में तकलीफ",
    "बेहोश",               # Unconscious
    "खून बह रहा है",       # Bleeding
    "दौरा",                # Seizure
    "मिर्गी",
    "आत्महत्या",           # Suicide
    "जहर",                 # Poison
    "लकवा",               # Paralysis
    "स्ट्रोक",
}

# Marathi
EMERGENCY_KEYWORDS_MR = {
    "छाती दुखणे",          # Chest pain
    "हृदयविकाराचा झटका",   # Heart attack
    "श्वास घेण्यास त्रास",  # Breathing difficulty
    "बेशुद्ध",              # Unconscious
    "रक्तस्त्राव",          # Bleeding
    "झटका",                # Seizure
    "आत्महत्या",           # Suicide
    "विष",                  # Poison
}

# Tamil
EMERGENCY_KEYWORDS_TA = {
    "மார்பு வலி",          # Chest pain
    "மாரடைப்பு",           # Heart attack
    "மூச்சு திணறல்",       # Breathlessness
    "மயக்கம்",             # Unconscious
    "இரத்தம் வெளியேறுகிறது",  # Bleeding
    "வலிப்பு",             # Seizure
    "தற்கொலை",            # Suicide
}

# Telugu
EMERGENCY_KEYWORDS_TE = {
    "గుండె నొప్పి",        # Chest pain
    "గుండె పోటు",          # Heart attack
    "శ్వాస తీసుకోలేకపోతున్నాను",  # Can't breathe
    "స్పృహ కోల్పోయారు",   # Unconscious
    "రక్తస్రావం",           # Bleeding
    "మూర్ఛ",               # Seizure
    "ఆత్మహత్య",           # Suicide
}

ALL_EMERGENCY_KEYWORDS: List[str] = list(
    EMERGENCY_KEYWORDS_EN
    | EMERGENCY_KEYWORDS_HI
    | EMERGENCY_KEYWORDS_MR
    | EMERGENCY_KEYWORDS_TA
    | EMERGENCY_KEYWORDS_TE
)


def detect_emergency(query: str) -> Tuple[bool, List[str]]:
    """
    Fast keyword scan for emergency indicators.
    Returns (is_emergency: bool, matched_keywords: List[str])
    
    Runs BEFORE any LLM call — must be synchronous and fast.
    """
    query_lower = query.lower()
    matched: List[str] = []

    for keyword in ALL_EMERGENCY_KEYWORDS:
        # Use word-boundary aware matching for English, substring for Indic scripts
        if any(ord(c) > 127 for c in keyword):
            # Indic script: simple substring match
            if keyword in query:
                matched.append(keyword)
        else:
            # English: whole-phrase match (partial word OK for medical terms)
            if keyword in query_lower:
                matched.append(keyword)

    return bool(matched), matched


def build_emergency_alert(matched_keywords: List[str]) -> EmergencyAlert:
    """Construct an EmergencyAlert from matched keywords."""
    return EmergencyAlert(
        message=(
            "⚠️ Your query contains symptoms that may require immediate medical attention. "
            "Please do not wait — seek emergency help NOW."
        ),
        helpline_national="112",
        helpline_aiims="1800-11-7222",
        action="Go to the nearest emergency room immediately. Do NOT delay seeking care.",
        detected_keywords=matched_keywords[:5],  # Limit to first 5 for response
    )
