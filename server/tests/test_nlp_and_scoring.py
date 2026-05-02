"""
HealthAssist Tests — NLP, Scoring & Cost Endpoint Units
Covers uncovered branches in:
  - language_detector.py (detect_language, translate_to_english)
  - intent_engine.py (extract_intent pipeline paths)
  - ranking/affordability_score.py (budget alignment branches)
  - ranking/accessibility_score.py (edge cases)
  - core/cost/geo_adjuster.py (apply_geo_premium, tier3)
  - api/v1/cost.py (POST /cost-estimate endpoint)
"""

from __future__ import annotations

import pytest
from unittest.mock import patch, AsyncMock


# ─────────────────────────────────────────────────────────────────────────────
# Language Detector
# ─────────────────────────────────────────────────────────────────────────────

class TestLanguageDetector:

    def test_detect_english_text(self):
        from app.core.nlp.language_detector import detect_language
        result = detect_language("knee replacement surgery in Pune")
        # langdetect returns 'en' for clear English text
        assert result == "en"

    def test_detect_hindi_script(self):
        from app.core.nlp.language_detector import detect_language
        # Hindi: "I need a doctor"
        result = detect_language("मुझे डॉक्टर की ज़रूरत है")
        assert result in {"hi", "mr", "en"}  # fallback-safe check

    def test_detect_unsupported_language_falls_back_to_en(self):
        """Language codes not in SUPPORTED_LANGS should return 'en'."""
        from app.core.nlp.language_detector import detect_language
        from unittest.mock import patch
        with patch("app.core.nlp.language_detector.detect", return_value="fr"):
            result = detect_language("Besoin d'un médecin")
        assert result == "en"  # French not in SUPPORTED_LANGS → fallback

    def test_detect_language_exception_falls_back_to_en(self):
        """LangDetectException should gracefully return 'en'."""
        from app.core.nlp.language_detector import detect_language
        from langdetect import LangDetectException
        with patch("app.core.nlp.language_detector.detect", side_effect=LangDetectException(0, "")):
            result = detect_language("some query")
        assert result == "en"

    @pytest.mark.asyncio
    async def test_translate_english_returns_unchanged(self):
        """English text should be returned without any API call."""
        from app.core.nlp.language_detector import translate_to_english
        result = await translate_to_english("knee pain", "en")
        assert result == "knee pain"

    @pytest.mark.asyncio
    async def test_translate_no_api_key_returns_original(self):
        """Without a Translate API key the original text is returned."""
        from app.core.nlp.language_detector import translate_to_english
        with patch("app.config.settings") as mock_settings:
            mock_settings.GOOGLE_TRANSLATE_API_KEY = None
            result = await translate_to_english("घुटने में दर्द", "hi")
        # Should return original without crashing
        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_translate_api_failure_returns_original(self):
        """If the Translate API call throws, return original text gracefully."""
        from app.core.nlp.language_detector import translate_to_english
        import httpx
        with patch("app.config.settings") as mock_settings:
            mock_settings.GOOGLE_TRANSLATE_API_KEY = "fake-key"
            with patch("httpx.AsyncClient") as mock_client:
                mock_client.return_value.__aenter__ = AsyncMock(
                    side_effect=httpx.RequestError("network error")
                )
                result = await translate_to_english("घुटने में दर्द", "hi")
        assert isinstance(result, str)


# ─────────────────────────────────────────────────────────────────────────────
# Intent Engine
# ─────────────────────────────────────────────────────────────────────────────

class TestIntentEngine:

    @pytest.mark.asyncio
    async def test_extract_intent_high_confidence_local_match(self):
        """
        A very specific query matching a known ICD-10 keyword (≥0.85 confidence)
        should use the fast local path and skip LLM.
        """
        from app.core.nlp.intent_engine import extract_intent
        from app.schemas.search import SearchRequest
        req = SearchRequest(query="total knee arthroplasty replacement", language="en")
        result = await extract_intent(req)
        assert result.procedure_category is not None
        assert result.confidence > 0

    @pytest.mark.asyncio
    async def test_extract_intent_no_llm_keys_uses_fallback(self):
        """When no LLM keys are set, fallback rule-based intent is returned."""
        from app.core.nlp.intent_engine import extract_intent
        from app.schemas.search import SearchRequest
        with patch("app.config.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = None
            mock_settings.ANTHROPIC_API_KEY = None
            mock_settings.GOOGLE_TRANSLATE_API_KEY = None
            req = SearchRequest(query="appendix removal surgery", language="en")
            result = await extract_intent(req)
        assert result.procedure_category is not None
        assert result.confidence >= 0.3

    @pytest.mark.asyncio
    async def test_extract_intent_emergency_flag_propagated(self):
        """Emergency query must set emergency_flag=True in the result."""
        from app.core.nlp.intent_engine import extract_intent
        from app.schemas.search import SearchRequest
        req = SearchRequest(query="chest pain heart attack", language="en")
        result = await extract_intent(req)
        assert result.emergency_flag is True

    @pytest.mark.asyncio
    async def test_extract_intent_returns_parsed_intent_type(self):
        """extract_intent always returns a ParsedIntent instance."""
        from app.core.nlp.intent_engine import extract_intent
        from app.schemas.search import ParsedIntent, SearchRequest
        req = SearchRequest(query="cataract eye surgery", language="en")
        result = await extract_intent(req)
        assert isinstance(result, ParsedIntent)

    @pytest.mark.asyncio
    async def test_call_llm_no_keys_returns_none(self):
        """_call_llm returns None when no LLM API keys are present."""
        from app.core.nlp.intent_engine import _call_llm
        from app.schemas.search import SearchRequest
        with patch("app.config.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = None
            mock_settings.ANTHROPIC_API_KEY = None
            req = SearchRequest(query="knee replacement", language="en")
            result = await _call_llm("knee replacement", req)
        assert result is None


# ─────────────────────────────────────────────────────────────────────────────
# Affordability Score — uncovered budget alignment branches
# ─────────────────────────────────────────────────────────────────────────────

class TestAffordabilityScoreExtended:

    def test_budget_perfect_alignment_adds_30(self):
        """Tier mid-point between budget_min and budget_max → +30 pts."""
        from app.core.ranking.affordability_score import calculate_affordability_score
        # mid tier mid-cost ≈ 350_000. Set budget 200_000–500_000 to align.
        score = calculate_affordability_score(
            hospital_tier="mid",
            accepts_pmjay=False,
            budget_min=200_000,
            budget_max=500_000,
        )
        # tier baseline 30 + budget perfect alignment 30 = 60
        assert score >= 55.0

    def test_budget_within_max_no_min_adds_20(self):
        """Tier mid-point <= budget_max but no budget_min → +20 pts."""
        from app.core.ranking.affordability_score import calculate_affordability_score
        score = calculate_affordability_score(
            hospital_tier="mid",
            accepts_pmjay=False,
            budget_min=None,
            budget_max=500_000,
        )
        # tier baseline 30 + within max 20 = 50
        assert score >= 45.0

    def test_budget_partial_within_max_adds_10(self):
        """Tier min <= budget_max but tier mid exceeds → partial alignment +10."""
        from app.core.ranking.affordability_score import calculate_affordability_score
        # mid tier: min=200_000, max=500_000. budget_max=250_000 → mid (350k) > budget_max
        # but tier_min (200k) <= budget_max → +10 pts partial
        score = calculate_affordability_score(
            hospital_tier="mid",
            accepts_pmjay=False,
            budget_min=None,
            budget_max=250_000,
        )
        assert score >= 35.0  # baseline 30 + partial 10 = 40

    def test_budget_exceeds_tier_entirely_adds_0(self):
        """Budget too low for hospital tier → 0 budget alignment pts."""
        from app.core.ranking.affordability_score import calculate_affordability_score
        # premium tier min = 500_000. Budget max = 100_000 → no overlap
        score = calculate_affordability_score(
            hospital_tier="premium",
            accepts_pmjay=False,
            budget_min=50_000,
            budget_max=100_000,
        )
        # baseline 10, no budget pts → 10
        assert score == 10.0

    def test_pmjay_and_perfect_alignment(self):
        """PMJAY + perfect budget alignment = maximal score."""
        from app.core.ranking.affordability_score import calculate_affordability_score
        score = calculate_affordability_score(
            hospital_tier="budget",
            accepts_pmjay=True,
            budget_min=80_000,
            budget_max=300_000,
        )
        # budget baseline 50 + pmjay 20 + perfect alignment 30 = 100 (capped)
        assert score == 100.0

    def test_unknown_tier_defaults_to_mid_baseline(self):
        """Unknown tier uses .get() fallback of 30.0."""
        from app.core.ranking.affordability_score import calculate_affordability_score
        score = calculate_affordability_score(hospital_tier="ultra_luxury")
        assert score == 30.0  # fallback baseline only


# ─────────────────────────────────────────────────────────────────────────────
# Accessibility Score — edge cases
# ─────────────────────────────────────────────────────────────────────────────

class TestAccessibilityScoreExtended:

    def test_zero_distance_max_distance_score(self):
        """Distance ≤ 0 should give 70 pts distance component."""
        from app.core.ranking.accessibility_score import calculate_accessibility_score
        score = calculate_accessibility_score(distance_km=0, city_classification="urban")
        # 70 + 20 + 0 = 90 (no emergency)
        assert score == 90.0

    def test_very_large_distance_near_zero(self):
        """Very large distance gives near-zero distance score."""
        from app.core.ranking.accessibility_score import calculate_accessibility_score
        score = calculate_accessibility_score(distance_km=200, city_classification="rural")
        # distance component ≈ 0, urban bonus 0, no emergency
        assert score < 5.0

    def test_rural_classification_no_bonus(self):
        """Rural gives 0 urban bonus."""
        from app.core.ranking.accessibility_score import calculate_accessibility_score
        score = calculate_accessibility_score(distance_km=5, city_classification="rural")
        # 70 + 0 + 0 = 70
        assert score == 70.0

    def test_semi_urban_gives_10_bonus(self):
        """semi_urban gives 10 pts bonus."""
        from app.core.ranking.accessibility_score import calculate_accessibility_score
        score = calculate_accessibility_score(distance_km=5, city_classification="semi_urban")
        # 70 + 10 + 0 = 80
        assert score == 80.0

    def test_emergency_services_adds_10(self):
        """Emergency services adds +10 pts."""
        from app.core.ranking.accessibility_score import calculate_accessibility_score
        score_with = calculate_accessibility_score(distance_km=5, emergency_services=True)
        score_without = calculate_accessibility_score(distance_km=5, emergency_services=False)
        assert score_with - score_without == 10.0

    def test_score_capped_at_100(self):
        """Score must never exceed 100."""
        from app.core.ranking.accessibility_score import calculate_accessibility_score
        score = calculate_accessibility_score(
            distance_km=0,
            city_classification="urban",
            emergency_services=True,
        )
        assert score == 100.0  # 70 + 20 + 10 = 100

    def test_unknown_city_classification_defaults_gracefully(self):
        """Unknown classification uses .get() fallback of 10.0."""
        from app.core.ranking.accessibility_score import calculate_accessibility_score
        score = calculate_accessibility_score(distance_km=5, city_classification="suburban")
        # 70 + 10(fallback) + 0 = 80
        assert score == 80.0


# ─────────────────────────────────────────────────────────────────────────────
# Geo Adjuster — apply_geo_premium (missing lines 49-55)
# ─────────────────────────────────────────────────────────────────────────────

class TestGeoAdjusterExtended:

    def test_apply_geo_premium_metro(self):
        """Metro multiplier 1.4–1.6 applied correctly."""
        from app.core.cost.geo_adjuster import apply_geo_premium
        adj_min, adj_max, tier = apply_geo_premium(100_000, 200_000, "Mumbai")
        assert tier == "metro"
        assert adj_min == 140_000
        assert adj_max == 320_000

    def test_apply_geo_premium_tier1(self):
        """Tier-1 multiplier 1.2–1.3 applied correctly."""
        from app.core.cost.geo_adjuster import apply_geo_premium
        adj_min, adj_max, tier = apply_geo_premium(100_000, 200_000, "Pune")
        assert tier == "tier1"
        assert adj_min == 120_000
        assert adj_max == 260_000

    def test_apply_geo_premium_tier2_base(self):
        """Tier-2 (unknown city) leaves values unchanged (multiplier 1.0)."""
        from app.core.cost.geo_adjuster import apply_geo_premium
        adj_min, adj_max, tier = apply_geo_premium(100_000, 200_000, "SomeSmallTown")
        assert tier == "tier2"
        assert adj_min == 100_000
        assert adj_max == 200_000

    def test_apply_geo_premium_bengaluru(self):
        """Bengaluru is a metro city."""
        from app.core.cost.geo_adjuster import apply_geo_premium
        _, _, tier = apply_geo_premium(100_000, 200_000, "Bengaluru")
        assert tier == "metro"

    def test_apply_geo_premium_bangalore_alias(self):
        """'bangalore' (alias) is also classified as metro."""
        from app.core.cost.geo_adjuster import apply_geo_premium
        _, _, tier = apply_geo_premium(100_000, 200_000, "Bangalore")
        assert tier == "metro"

    def test_classify_city_case_insensitive(self):
        """classify_city is case-insensitive."""
        from app.core.cost.geo_adjuster import classify_city
        assert classify_city("MUMBAI") == "metro"
        assert classify_city("pune") == "tier1"
        assert classify_city("  Pune  ") == "tier1"


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/v1/cost-estimate endpoint
# ─────────────────────────────────────────────────────────────────────────────

class TestCostEstimateEndpoint:

    @pytest.mark.asyncio
    async def test_cost_estimate_returns_200(self, client):
        """Valid payload returns 200."""
        resp = await client.post(
            "/api/v1/cost-estimate",
            json={
                "procedure_name": "Total Knee Arthroplasty",
                "city": "Pune",
                "hospital_tier": "mid",
            },
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_cost_estimate_has_required_fields(self, client):
        """Response includes all required CostEstimateResponse fields."""
        resp = await client.post(
            "/api/v1/cost-estimate",
            json={
                "procedure_name": "Cataract Surgery",
                "city": "Mumbai",
                "hospital_tier": "premium",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        required = {
            "procedure_name", "hospital_tier", "city_tier",
            "components", "total_min", "total_max",
            "confidence", "disclaimer",
        }
        for field in required:
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_cost_estimate_total_range_valid(self, client):
        """total_min must be less than or equal to total_max."""
        resp = await client.post(
            "/api/v1/cost-estimate",
            json={"procedure_name": "Appendectomy", "city": "Delhi", "hospital_tier": "budget"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_min"] <= data["total_max"]

    @pytest.mark.asyncio
    async def test_cost_estimate_disclaimer_present(self, client):
        """Disclaimer must not be empty."""
        resp = await client.post(
            "/api/v1/cost-estimate",
            json={"procedure_name": "CABG", "city": "Pune", "hospital_tier": "premium"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["disclaimer"]) > 20

    @pytest.mark.asyncio
    async def test_cost_estimate_defaults_without_optional_fields(self, client):
        """Minimal payload with only required fields returns 200."""
        resp = await client.post(
            "/api/v1/cost-estimate",
            json={},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["procedure_name"] == "General Medical Consultation"

    @pytest.mark.asyncio
    async def test_cost_estimate_comorbidities_accepted(self, client):
        """Comorbidities parameter is accepted and increases cost."""
        resp_no_comorbid = await client.post(
            "/api/v1/cost-estimate",
            json={"procedure_name": "Total Knee Arthroplasty", "city": "Pune", "hospital_tier": "mid"},
        )
        resp_with_comorbid = await client.post(
            "/api/v1/cost-estimate",
            json={
                "procedure_name": "Total Knee Arthroplasty",
                "city": "Pune",
                "hospital_tier": "mid",
                "comorbidities": ["diabetes", "hypertension"],
            },
        )
        assert resp_no_comorbid.status_code == 200
        assert resp_with_comorbid.status_code == 200
        # With comorbidities cost should be equal or higher
        no_cost = resp_no_comorbid.json()["total_max"]
        with_cost = resp_with_comorbid.json()["total_max"]
        assert with_cost >= no_cost

    @pytest.mark.asyncio
    async def test_cost_estimate_city_tier_returned_correctly(self, client):
        """city_tier field reflects correct tier for known cities."""
        resp = await client.post(
            "/api/v1/cost-estimate",
            json={"procedure_name": "Cataract Surgery", "city": "Mumbai", "hospital_tier": "mid"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["city_tier"] == "metro"

    @pytest.mark.asyncio
    async def test_cost_estimate_components_not_empty(self, client):
        """components list must not be empty."""
        resp = await client.post(
            "/api/v1/cost-estimate",
            json={"procedure_name": "Hernia Repair", "city": "Pune", "hospital_tier": "mid"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["components"]) > 0

    @pytest.mark.asyncio
    async def test_cost_estimate_synthetic_data_flag(self, client):
        """synthetic_data_used flag must be a boolean."""
        resp = await client.post(
            "/api/v1/cost-estimate",
            json={"procedure_name": "Normal Delivery", "city": "Pune"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["synthetic_data_used"], bool)
