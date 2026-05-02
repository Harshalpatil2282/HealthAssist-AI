"""
HealthAssist — NLP Intent Engine
Pipeline:
  1. Language detection
  2. Translation to English (if needed)
  3. Emergency detection (FIRST — before LLM)
  4. Local ICD-10 lookup (fast path)
  5. LLM-based intent extraction (GPT-4o via litellm)
  6. ICD-10 normalization via fuzzy match
  7. Ambiguity resolution (clarifying questions if confidence < 0.6)
"""

from __future__ import annotations

import json
import structlog
from typing import Optional

from app.config import settings
from app.schemas.search import ParsedIntent, SearchRequest
from app.core.nlp.emergency_detector import detect_emergency
from app.core.nlp.language_detector import detect_language, translate_to_english
from app.core.nlp.symptom_mapper import get_best_icd10, map_symptoms_to_icd10

logger = structlog.get_logger(__name__)

# ── Cities present in the real hospital dataset (hospital_dataset_1500_rows.xlsx)
INDIA_CITIES: dict[str, tuple[str, str]] = {
    # city_lower: (canonical_city, state)
    "mumbai": ("Mumbai", "Maharashtra"),
    "delhi": ("Delhi", "Delhi"),
    "new delhi": ("Delhi", "Delhi"),
    "bengaluru": ("Bengaluru", "Karnataka"),
    "bangalore": ("Bengaluru", "Karnataka"),
    "hyderabad": ("Hyderabad", "Telangana"),
    "chennai": ("Chennai", "Tamil Nadu"),
    "kolkata": ("Kolkata", "West Bengal"),
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


def _extract_city_state(query: str) -> tuple[str | None, str | None]:
    """Extract city and state from free-text query using keyword lookup."""
    q_lower = query.lower()
    for keyword, (city, state) in INDIA_CITIES.items():
        if keyword in q_lower:
            return city, state
    return None, None

# ── LLM System Prompt ─────────────────────────────────────────────────────────
LLM_SYSTEM_PROMPT = """You are a clinical NLP assistant for HealthAssist — an AI healthcare navigation platform in India.
Your task: Extract structured medical intent from a patient's natural language query.

STRICT RULES:
- NEVER suggest a diagnosis
- NEVER recommend treatment
- ONLY extract: procedure type, body system, clinical context
- If query contains emergency symptoms, set emergency_flag = true immediately
- Output ONLY valid JSON matching the schema provided

Output schema:
{
  "procedure_category": "<string — e.g. 'Coronary Angioplasty'>",
  "body_system": "<string — e.g. 'cardiovascular'>",
  "icd10_candidates": ["<icd10_code>"],
  "clinical_context": ["<context_tag>"],
  "emergency_flag": <boolean>,
  "confidence": <float 0.0-1.0>,
  "clarifying_questions": ["<question if ambiguous>"]
}

If the query is ambiguous or unclear, set confidence < 0.6 and add 1-3 clarifying questions.
Example query: "knee replacement in Pune, diabetic, 62 years"
Example output: {"procedure_category": "Total Knee Arthroplasty", "body_system": "musculoskeletal", ...}
"""


async def extract_intent(request: SearchRequest) -> ParsedIntent:
    """
    Main intent extraction pipeline.
    Returns ParsedIntent with procedure, ICD-10 codes, context, and confidence.
    """
    query = request.query
    logger.info("Intent extraction started", query=query[:80])

    # ── Step 1: Language detection ────────────────────────────────────────────
    lang = detect_language(query)

    # ── Step 2: Translate if needed ───────────────────────────────────────────
    english_query = await translate_to_english(query, lang)

    # ── Step 3: Emergency detection (ALWAYS FIRST) ────────────────────────────
    is_emergency, matched_kw = detect_emergency(english_query)
    if is_emergency:
        logger.warning("Emergency detected in query", keywords=matched_kw)

    # ── Step 4: Fast local ICD-10 lookup ─────────────────────────────────────
    icd_results = map_symptoms_to_icd10(english_query, top_n=3)
    best_icd = get_best_icd10(english_query)

    # ── Location extraction (shared across all return paths) ──────────────────
    city, state = _extract_city_state(english_query)
    if not city:
        city, state = _extract_city_state(query)

    if best_icd and best_icd[3] >= 0.85:
        code, category, body_system, confidence = best_icd
        logger.info("High-confidence local ICD-10 match", code=code, confidence=confidence)
        return ParsedIntent(
            procedure_category=category,
            body_system=body_system,
            icd10_code=code,
            icd10_candidates=[r[0] for r in icd_results],
            clinical_context=[body_system],
            emergency_flag=is_emergency,
            confidence=confidence,
            ambiguity_flags=[],
            city=city,
            state=state,
        )

    # ── Step 5: LLM-based intent extraction ──────────────────────────────────
    llm_result = await _call_llm(english_query, request)

    if llm_result:
        if not llm_result.get("icd10_candidates") and icd_results:
            llm_result["icd10_candidates"] = [r[0] for r in icd_results]
        return ParsedIntent(
            procedure_category=llm_result.get("procedure_category", "General Medical Consultation"),
            body_system=llm_result.get("body_system"),
            icd10_code=llm_result.get("icd10_candidates", [None])[0],
            icd10_candidates=llm_result.get("icd10_candidates", []),
            clinical_context=llm_result.get("clinical_context", []),
            emergency_flag=is_emergency or llm_result.get("emergency_flag", False),
            confidence=llm_result.get("confidence", 0.5),
            ambiguity_flags=llm_result.get("clarifying_questions", []),
            city=city,
            state=state,
        )

    # ── Step 6: Fallback (no LLM, low-confidence local) ──────────────────────
    logger.warning("Falling back to low-confidence rule-based intent")
    code, category, body_system, confidence = best_icd if best_icd else (None, "General Medical Consultation", "general", 0.3)

    return ParsedIntent(
        procedure_category=category,
        body_system=body_system,
        icd10_code=code,
        icd10_candidates=[r[0] for r in icd_results],
        clinical_context=[body_system] if body_system else [],
        emergency_flag=is_emergency,
        confidence=max(0.3, confidence),
        ambiguity_flags=[
            "Could you describe your main symptom in more detail?",
            "Which city or area are you looking for care in?",
        ],
    )


async def _call_llm(query: str, request: SearchRequest) -> Optional[dict]:
    """
    Call LLM via litellm for intent extraction.
    Returns parsed JSON dict or None on failure.
    """
    if not settings.OPENAI_API_KEY and not settings.ANTHROPIC_API_KEY:
        logger.warning("No LLM API keys configured — skipping LLM step")
        return None

    try:
        import litellm

        # Build context string
        context_parts = [f"Query: {query}"]
        if request.patient_age:
            context_parts.append(f"Patient age: {request.patient_age}")
        if request.comorbidities:
            context_parts.append(f"Comorbidities: {', '.join(request.comorbidities)}")
        if request.location:
            context_parts.append(f"Location: {request.location.pincode or 'not specified'}")

        user_message = "\n".join(context_parts)

        response = await litellm.acompletion(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": LLM_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=settings.LLM_MAX_TOKENS,
            temperature=settings.LLM_TEMPERATURE,
            response_format={"type": "json_object"},
            fallbacks=[settings.LLM_FALLBACK_MODEL],
        )

        content = response.choices[0].message.content
        parsed = json.loads(content)
        logger.info("LLM intent extracted", procedure=parsed.get("procedure_category"))
        return parsed

    except json.JSONDecodeError as e:
        logger.error("LLM returned invalid JSON", error=str(e))
        return None
    except Exception as e:
        logger.error("LLM call failed", error=str(e))
        return None
