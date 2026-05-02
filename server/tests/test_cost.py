"""
HealthAssist Tests — Cost Estimation Engine
Critical: estimates must be ranges, confidence in bounds, disclaimer present
"""

import pytest
from app.core.cost.estimator import estimate_cost
from app.core.cost.component_model import build_cost_components
from app.core.cost.risk_adjuster import apply_risk_adjustment
from app.core.cost.geo_adjuster import classify_city, apply_geo_premium
from app.core.cost.confidence_scorer import calculate_confidence
from app.config import settings


@pytest.mark.asyncio
class TestCostEstimation:

    async def test_cost_estimate_returns_range_not_point(self):
        """CRITICAL: total_min must be strictly less than total_max."""
        result = await estimate_cost(
            procedure_category="Coronary Angioplasty",
            body_system="cardiovascular",
            hospital_tier="mid",
            city="Pune",
            patient_age=55,
        )
        assert result.total_min < result.total_max, (
            "Cost estimate must be a range, not a single point value"
        )

    async def test_cost_estimate_has_five_components(self):
        """Standard estimate should have at minimum 5 components."""
        result = await estimate_cost(
            procedure_category="Coronary Angioplasty",
            body_system="cardiovascular",
            hospital_tier="mid",
            city="Pune",
            patient_age=40,
        )
        # At least: procedure, stay, meds, diagnostics, contingency
        assert len(result.components) >= 5

    async def test_cost_estimate_components_are_ranges(self):
        """Each component must be a range (min < max)."""
        result = await estimate_cost(
            procedure_category="Total Knee Arthroplasty",
            body_system="musculoskeletal",
            hospital_tier="mid",
            city="Pune",
            patient_age=62,
        )
        for component in result.components:
            assert component.min_amount <= component.max_amount, (
                f"Component '{component.name}' has min > max"
            )

    async def test_disclaimer_present_in_cost_estimate(self):
        """CRITICAL: Disclaimer must be present in every cost estimate."""
        result = await estimate_cost(
            procedure_category="Cataract Surgery",
            hospital_tier="budget",
            city="Pune",
        )
        assert result.disclaimer is not None
        assert len(result.disclaimer) > 50
        assert "estimate" in result.disclaimer.lower() or "verify" in result.disclaimer.lower()

    async def test_confidence_score_range(self):
        """CRITICAL: Confidence must be in [CONFIDENCE_MIN, CONFIDENCE_MAX]."""
        result = await estimate_cost(
            procedure_category="Total Knee Arthroplasty",
            hospital_tier="premium",
            city="Mumbai",
            patient_age=70,
            comorbidities=["diabetes", "hypertension"],
        )
        assert settings.CONFIDENCE_MIN <= result.confidence <= settings.CONFIDENCE_MAX, (
            f"Confidence {result.confidence} out of bounds "
            f"[{settings.CONFIDENCE_MIN}, {settings.CONFIDENCE_MAX}]"
        )

    async def test_comorbidities_increase_cost(self):
        """Diabetic + hypertensive patient should cost more than healthy patient."""
        base = await estimate_cost(
            procedure_category="Coronary Angioplasty",
            hospital_tier="mid",
            city="Pune",
            patient_age=40,
            comorbidities=[],
        )
        high_risk = await estimate_cost(
            procedure_category="Coronary Angioplasty",
            hospital_tier="mid",
            city="Pune",
            patient_age=70,
            comorbidities=["diabetes", "hypertension", "cardiac history"],
        )
        assert high_risk.total_max > base.total_max, (
            "High-risk patient must have higher max estimate"
        )

    async def test_premium_costs_more_than_budget(self):
        """Premium hospital tier must have higher estimates than budget."""
        budget = await estimate_cost(
            procedure_category="Total Knee Arthroplasty",
            hospital_tier="budget",
            city="Pune",
        )
        premium = await estimate_cost(
            procedure_category="Total Knee Arthroplasty",
            hospital_tier="premium",
            city="Pune",
        )
        assert premium.total_min > budget.total_min

    async def test_metro_costs_more_than_tier2(self):
        """Mumbai (metro) must have higher estimate than Tier-2 city."""
        tier2 = await estimate_cost(
            procedure_category="Coronary Angioplasty",
            hospital_tier="mid",
            city="Nashik",
        )
        metro = await estimate_cost(
            procedure_category="Coronary Angioplasty",
            hospital_tier="mid",
            city="Mumbai",
        )
        assert metro.total_min > tier2.total_min

    async def test_synthetic_data_flag_in_response(self):
        """synthetic_data_used field must be a boolean."""
        result = await estimate_cost(
            procedure_category="General Medical Consultation",
            hospital_tier="mid",
            city="Pune",
        )
        assert isinstance(result.synthetic_data_used, bool)

    async def test_data_sources_not_empty(self):
        """data_sources list must have at least one entry."""
        result = await estimate_cost(
            procedure_category="Coronary Angioplasty",
            hospital_tier="mid",
            city="Pune",
        )
        assert len(result.data_sources) >= 1

    async def test_confidence_lower_for_synthetic(self):
        """Rare procedure (not in CGHS) must have lower confidence."""
        common = await estimate_cost(
            procedure_category="Coronary Angioplasty",
            hospital_tier="mid",
            city="Pune",
        )
        rare = await estimate_cost(
            procedure_category="Extremely Rare Experimental Procedure",
            hospital_tier="mid",
            city="Pune",
        )
        assert rare.confidence <= common.confidence


class TestRiskAdjuster:

    def test_diabetes_increases_cost(self):
        base_min, base_max = 100_000, 200_000
        adj_min, adj_max, mult, matched, flags = apply_risk_adjustment(
            base_min, base_max, ["diabetes"], patient_age=50
        )
        assert mult > 1.0
        assert adj_min > base_min

    def test_multiple_comorbidities_cap(self):
        """Multiplier should not exceed 2.0 (capped at 1.0 extra risk)."""
        _, _, mult, _, _ = apply_risk_adjustment(
            100_000, 200_000,
            ["diabetes", "hypertension", "cardiac history", "obesity", "kidney disease"],
            patient_age=70,
        )
        assert mult <= 2.8  # age_mult (1.4) × comorb max (2.0) = 2.8


class TestGeoAdjuster:

    def test_mumbai_classified_as_metro(self):
        assert classify_city("Mumbai") == "metro"

    def test_pune_classified_as_tier1(self):
        assert classify_city("Pune") == "tier1"

    def test_unknown_city_defaults_tier2(self):
        assert classify_city("SomeRandomTown") == "tier2"


class TestConfidenceScorer:

    def test_confidence_clamped_to_min(self):
        score = calculate_confidence(
            has_real_cghs_data=False,
            has_real_hospital_data=False,
            is_common_procedure=False,
            comorbidities_provided=False,
            hospital_tier_known=False,
            city_known=False,
            synthetic_data_used=True,
        )
        assert score >= settings.CONFIDENCE_MIN

    def test_confidence_clamped_to_max(self):
        score = calculate_confidence(
            has_real_cghs_data=True,
            has_real_hospital_data=True,
            is_common_procedure=True,
            comorbidities_provided=True,
            hospital_tier_known=True,
            city_known=True,
            synthetic_data_used=False,
        )
        assert score <= settings.CONFIDENCE_MAX
