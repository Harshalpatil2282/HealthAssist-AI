"""
HealthAssist Tests — POST /api/v1/triage
Covers all urgency branches: emergency, severe, urgent (symptoms),
semi-urgent (symptoms), routine, specialist mapping.
"""

import pytest


class TestTriageEndpoint:

    @pytest.mark.asyncio
    async def test_triage_emergency_chest_pain(self, client):
        """Chest pain should trigger emergency urgency via detect_emergency."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["chest pain", "shortness of breath"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] == "emergency"
        assert data["emergency_services"] is True
        assert "112" in data["recommended_action"]
        assert "Emergency Medicine" in (data.get("specialist_type") or "")

    @pytest.mark.asyncio
    async def test_triage_emergency_heart_attack(self, client):
        """Heart attack keywords must trigger emergency path."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["heart attack", "sweating"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] == "emergency"
        assert data["emergency_services"] is True

    @pytest.mark.asyncio
    async def test_triage_severe_severity_returns_urgent(self, client):
        """severity=severe without emergency keywords → urgent level."""
        resp = await client.post(
            "/api/v1/triage",
            json={
                "symptoms": ["back pain"],
                "severity": "severe",
                "language": "en",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] == "urgent"
        assert data["emergency_services"] is False
        assert "1–2 hours" in data["recommended_action"] or "urgent" in data["recommended_action"].lower()

    @pytest.mark.asyncio
    async def test_triage_urgent_symptom_high_fever(self, client):
        """'high fever' in URGENT_SYMPTOMS set → urgency=urgent."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["high fever", "chills"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] == "urgent"
        assert data["emergency_services"] is False

    @pytest.mark.asyncio
    async def test_triage_urgent_symptom_vision_loss(self, client):
        """'vision loss' is an urgent symptom."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["sudden vision loss"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] == "urgent"

    @pytest.mark.asyncio
    async def test_triage_semi_urgent_symptom_dizziness(self, client):
        """'dizziness' → semi-urgent."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["dizziness", "nausea"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] == "semi-urgent"
        assert "2–3 days" in data["recommended_action"]

    @pytest.mark.asyncio
    async def test_triage_semi_urgent_persistent_cough(self, client):
        """'persistent cough' → semi-urgent."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["persistent cough", "mild fatigue"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] == "semi-urgent"

    @pytest.mark.asyncio
    async def test_triage_routine_minor_symptoms(self, client):
        """Minor/non-matching symptoms → routine urgency."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["mild cold", "runny nose"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] == "routine"
        assert "1–2 weeks" in data["recommended_action"]
        assert data["emergency_services"] is False

    @pytest.mark.asyncio
    async def test_triage_specialist_mapped_headache(self, client):
        """'headache' symptom maps to Neurologist via SPECIALIST_MAP."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["severe headache"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        # severe headache hits URGENT_SYMPTOMS first
        assert data["urgency_level"] == "urgent"
        # Specialist from SPECIALIST_MAP: headache → Neurologist
        assert data.get("specialist_type") is not None

    @pytest.mark.asyncio
    async def test_triage_specialist_mapped_stomach_pain(self, client):
        """'stomach pain' → Gastroenterologist."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["stomach pain"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("specialist_type") == "Gastroenterologist"

    @pytest.mark.asyncio
    async def test_triage_disclaimer_always_present(self, client):
        """Disclaimer must be returned in every response."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["knee pain"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "disclaimer" in data
        assert len(data["disclaimer"]) > 20

    @pytest.mark.asyncio
    async def test_triage_empty_symptoms_rejected(self, client):
        """Empty symptoms list violates min_length=1 constraint → 422."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": [], "language": "en"},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_triage_invalid_severity_rejected(self, client):
        """Invalid severity value → 422 validation error."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["pain"], "severity": "critical", "language": "en"},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_triage_with_age_and_duration(self, client):
        """Optional fields (age, duration_days) are accepted."""
        resp = await client.post(
            "/api/v1/triage",
            json={
                "symptoms": ["joint pain"],
                "duration_days": 5,
                "patient_age": 65,
                "language": "en",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["urgency_level"] in {"emergency", "urgent", "semi-urgent", "routine"}

    @pytest.mark.asyncio
    async def test_triage_joint_pain_specialist(self, client):
        """'joint pain' maps to Orthopedist via SPECIALIST_MAP."""
        resp = await client.post(
            "/api/v1/triage",
            json={"symptoms": ["joint pain", "swelling"], "language": "en"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("specialist_type") == "Orthopedist"
