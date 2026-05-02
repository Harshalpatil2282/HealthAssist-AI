"""
HealthAssist Tests — PMJAY Eligibility Checker
Critical: disclaimer always present, BPL eligible, APL rich ineligible
"""

import pytest
from app.core.pmjay.eligibility_checker import check_eligibility
from app.schemas.pmjay import PMJAYCheckRequest


class TestPMJAYChecker:

    def _make_request(self, **kwargs) -> PMJAYCheckRequest:
        defaults = {
            "state": "Maharashtra",
            "annual_income": 180000,
            "ration_card_type": "BPL",
            "family_size": 4,
        }
        defaults.update(kwargs)
        return PMJAYCheckRequest(**defaults)

    def test_pmjay_check_bpl_eligible(self):
        """CRITICAL: BPL ration card holder must be likely eligible."""
        req = self._make_request(ration_card_type="BPL", annual_income=150000)
        result = check_eligibility(req)
        assert result.likely_eligible is True, "BPL cardholder should be likely eligible"

    def test_pmjay_check_aay_eligible(self):
        """AAY (Antyodaya Anna Yojana) card → highest priority → eligible."""
        req = self._make_request(ration_card_type="AAY", annual_income=80000)
        result = check_eligibility(req)
        assert result.likely_eligible is True

    def test_pmjay_check_low_income_eligible(self):
        """APL with income below ₹2.5L threshold should be eligible."""
        req = self._make_request(ration_card_type="APL", annual_income=200000)
        result = check_eligibility(req)
        assert result.likely_eligible is True

    def test_pmjay_check_high_income_ineligible(self):
        """APL with high income should not be eligible."""
        req = self._make_request(ration_card_type="APL", annual_income=800000)
        result = check_eligibility(req)
        assert result.likely_eligible is False

    def test_pmjay_check_disclaimer_present(self):
        """CRITICAL: Disclaimer must be present in every PMJAY response."""
        req = self._make_request()
        result = check_eligibility(req)
        assert result.disclaimer is not None
        assert len(result.disclaimer) > 50
        assert "pmjay.gov.in" in result.disclaimer.lower() or "official" in result.disclaimer.lower()

    def test_pmjay_official_portal_always_returned(self):
        """Official portal URL must always be returned."""
        req = self._make_request()
        result = check_eligibility(req)
        assert result.official_portal == "https://pmjay.gov.in"

    def test_pmjay_coverage_amount_for_eligible(self):
        """Coverage amount must be ₹5,00,000 for eligible candidates."""
        req = self._make_request(ration_card_type="BPL")
        result = check_eligibility(req)
        if result.likely_eligible:
            assert result.coverage_amount == 500_000

    def test_pmjay_next_steps_not_empty(self):
        """next_steps must always contain at least one action."""
        req = self._make_request()
        result = check_eligibility(req)
        assert len(result.next_steps) >= 1

    def test_pmjay_helpline_returned(self):
        """Helpline number must be returned."""
        req = self._make_request()
        result = check_eligibility(req)
        assert result.helpline == "14555"

    def test_pmjay_eligibility_reason_not_empty(self):
        """eligibility_reason must always be a non-empty string."""
        req = self._make_request()
        result = check_eligibility(req)
        assert result.eligibility_reason is not None
        assert len(result.eligibility_reason) > 10
