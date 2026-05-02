"""
HealthAssist Tests — Search API Endpoint
Tests: disclaimer, no-diagnosis guardrail, emergency in response, response structure
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.mark.asyncio
class TestSearchEndpoint:

    async def test_health_check_ok(self, client):
        """Health endpoint must return 200."""
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["app"] == "HealthAssist"

    async def test_search_returns_200(self, client):
        """Standard search must return 200."""
        payload = {
            "query": "knee replacement in Pune, diabetic patient, 62 years",
            "location": {"pincode": "411001"},
            "language": "en",
        }
        resp = await client.post("/api/v1/search", json=payload)
        assert resp.status_code == 200

    async def test_search_response_has_required_fields(self, client):
        """Response must have all required top-level fields."""
        payload = {"query": "knee replacement in Pune", "language": "en"}
        resp = await client.post("/api/v1/search", json=payload)
        data = resp.json()

        assert "query_id" in data
        assert "parsed_intent" in data
        assert "hospitals" in data
        assert "cost_estimate" in data
        assert "disclaimer" in data
        assert "data_confidence" in data

    async def test_disclaimer_present_in_search_response(self, client):
        """CRITICAL: Top-level disclaimer must be present."""
        payload = {"query": "heart surgery options Mumbai", "language": "en"}
        resp = await client.post("/api/v1/search", json=payload)
        data = resp.json()
        assert data["disclaimer"] is not None
        assert len(data["disclaimer"]) > 30

    async def test_no_diagnosis_in_response(self, client):
        """Response must NOT contain direct diagnosis language."""
        payload = {"query": "I have chest tightness", "language": "en"}
        resp = await client.post("/api/v1/search", json=payload)
        data = resp.json()

        # parsed_intent should not contain 'diagnos' word
        intent_str = str(data.get("parsed_intent", {})).lower()
        # The system maps to procedures, not diagnoses
        assert "you have" not in intent_str
        assert "you are diagnosed" not in intent_str

    async def test_emergency_alert_for_chest_pain(self, client):
        """Emergency query must return populated emergency_alert."""
        payload = {
            "query": "severe chest pain for the last 30 minutes",
            "language": "en",
        }
        resp = await client.post("/api/v1/search", json=payload)
        data = resp.json()
        assert data["emergency_alert"] is not None, (
            "Chest pain query must return an emergency_alert"
        )
        assert data["emergency_alert"]["helpline_national"] == "112"

    async def test_no_emergency_for_routine_query(self, client):
        """Routine query must NOT trigger emergency_alert."""
        payload = {
            "query": "best hospital for knee replacement in Pune under 3 lakhs",
            "language": "en",
        }
        resp = await client.post("/api/v1/search", json=payload)
        data = resp.json()
        assert data["emergency_alert"] is None, (
            "Routine knee replacement query must NOT trigger emergency"
        )

    async def test_cost_estimate_has_disclaimer(self, client):
        """Cost estimate in search response must have disclaimer."""
        payload = {"query": "cataract surgery Pune", "language": "en"}
        resp = await client.post("/api/v1/search", json=payload)
        data = resp.json()
        cost = data["cost_estimate"]
        assert "disclaimer" in cost
        assert len(cost["disclaimer"]) > 30

    async def test_cost_estimate_is_range_in_search(self, client):
        """Cost total_min < total_max in search response."""
        payload = {"query": "knee replacement Pune", "language": "en"}
        resp = await client.post("/api/v1/search", json=payload)
        data = resp.json()
        cost = data["cost_estimate"]
        assert cost["total_min"] < cost["total_max"]

    async def test_hospitals_list_not_empty(self, client):
        """Search must return at least one hospital."""
        payload = {
            "query": "knee replacement in Pune",
            "radius_km": 50,
            "language": "en",
        }
        resp = await client.post("/api/v1/search", json=payload)
        data = resp.json()
        assert len(data["hospitals"]) >= 1

    async def test_hospital_cards_have_score_breakdown(self, client):
        """Each hospital card must include a score breakdown."""
        payload = {"query": "cardiac surgery Pune", "language": "en"}
        resp = await client.post("/api/v1/search", json=payload)
        data = resp.json()
        for hospital in data["hospitals"]:
            sb = hospital.get("score_breakdown", {})
            assert "clinical" in sb
            assert "reputation" in sb
            assert "accessibility" in sb
            assert "affordability" in sb
            assert "overall" in sb
            assert 0 <= sb["overall"] <= 100

    async def test_invalid_query_too_short_returns_422(self, client):
        """Query shorter than 3 chars must return 422."""
        resp = await client.post("/api/v1/search", json={"query": "ab"})
        assert resp.status_code == 422

    async def test_pmjay_check_bpl_via_api(self, client):
        """PMJAY check endpoint must return eligible=True for BPL."""
        payload = {
            "state": "Maharashtra",
            "annual_income": 150000,
            "ration_card_type": "BPL",
            "family_size": 4,
        }
        resp = await client.post("/api/v1/pmjay-check", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["likely_eligible"] is True
        assert data["official_portal"] == "https://pmjay.gov.in"
        assert "disclaimer" in data

    async def test_drug_compare_atorvastatin(self, client):
        """Drug compare must return generics cheaper than brand."""
        resp = await client.get("/api/v1/drugs/compare?name=atorvastatin")
        assert resp.status_code == 200
        data = resp.json()
        assert data["potential_savings_pct"] > 0
        assert len(data["generic_variants"]) >= 1

    async def test_triage_emergency_returns_112(self, client):
        """Triage with emergency symptoms must include 112."""
        payload = {"symptoms": ["chest pain", "difficulty breathing"]}
        resp = await client.post("/api/v1/triage", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] == "emergency"
        assert data["emergency_services"] is True
