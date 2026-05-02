"""
HealthAssist — Language Detector
Detects input language and translates to English for the NLP pipeline.
Supports: en, hi, mr, ta, te, kn, gu, bn, pa, ml
"""

from __future__ import annotations

import structlog
from langdetect import detect, LangDetectException

logger = structlog.get_logger(__name__)

SUPPORTED_LANGS = {"en", "hi", "mr", "ta", "te", "kn", "gu", "bn", "pa", "ml"}

LANG_DISPLAY_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "gu": "Gujarati",
    "bn": "Bengali",
    "pa": "Punjabi",
    "ml": "Malayalam",
}


def detect_language(text: str) -> str:
    """
    Detect language of input text.
    Returns ISO 639-1 code. Falls back to 'en' on failure.
    """
    try:
        lang = detect(text)
        if lang in SUPPORTED_LANGS:
            logger.info("Language detected", lang=lang, display=LANG_DISPLAY_NAMES.get(lang))
            return lang
        return "en"  # Treat unsupported as English
    except LangDetectException:
        logger.warning("Language detection failed, defaulting to English")
        return "en"


async def translate_to_english(text: str, source_lang: str) -> str:
    """
    Translate text to English if not already in English.
    Uses Google Translate API if key available, else returns text as-is.
    
    NOTE: For production, integrate Helsinki-NLP/opus-mt models as offline fallback.
    """
    if source_lang == "en":
        return text

    from app.config import settings
    if not settings.GOOGLE_TRANSLATE_API_KEY:
        logger.warning(
            "Google Translate API key not configured. "
            "Proceeding with original text — NLP accuracy may be reduced.",
            source_lang=source_lang,
        )
        return text

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://translation.googleapis.com/language/translate/v2",
                params={
                    "key": settings.GOOGLE_TRANSLATE_API_KEY,
                    "source": source_lang,
                    "target": "en",
                    "q": text,
                },
                timeout=5.0,
            )
            resp.raise_for_status()
            data = resp.json()
            translated = data["data"]["translations"][0]["translatedText"]
            logger.info("Translated query", src=source_lang, preview=translated[:80])
            return translated
    except Exception as e:
        logger.error("Translation failed", error=str(e))
        return text  # Graceful degradation
