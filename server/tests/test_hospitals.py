"""
HealthAssist Tests — Hospital Endpoints
GET /api/v1/hospitals  (list, filter, paginate)
GET /api/v1/hospitals/{id}  (detail, 404)
"""

import pytest


class TestHospitalListEndpoint:

    @pytest.mark.asyncio
    async def test_list_hospitals_default_returns_200(self, client):
        """Default hospital list returns 200 with hospitals key."""
        resp = await client.get("/api/v1/hospitals")
        assert resp.status_code == 200
        data = resp.json()
        assert "hospitals" in data
        assert "total" in data
        assert "page" in data
        assert "per_page" in data

    @pytest.mark.asyncio
    async def test_list_hospitals_total_count(self, client):
        """Total should reflect all synthetic hospitals (13 entries)."""
        resp = await client.get("/api/v1/hospitals")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 10  # at least 10 synthetic hospitals defined

    @pytest.mark.asyncio
    async def test_list_hospitals_filter_by_city_pune(self, client):
        """Filtering by city=Pune should return only Pune hospitals."""
        resp = await client.get("/api/v1/hospitals", params={"city": "Pune"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] > 0
        for hosp in data["hospitals"]:
            assert hosp["city"].lower() == "pune"

    @pytest.mark.asyncio
    async def test_list_hospitals_filter_by_city_mumbai(self, client):
        """Filtering by city=Mumbai returns only Mumbai hospitals."""
        resp = await client.get("/api/v1/hospitals", params={"city": "Mumbai"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 2  # kokilaben + tata memorial
        for hosp in data["hospitals"]:
            assert hosp["city"].lower() == "mumbai"

    @pytest.mark.asyncio
    async def test_list_hospitals_filter_type_government(self, client):
        """hospital_type=government returns only government hospitals."""
        resp = await client.get("/api/v1/hospitals", params={"hospital_type": "government"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] > 0
        for hosp in data["hospitals"]:
            assert hosp["hospital_type"] == "government"

    @pytest.mark.asyncio
    async def test_list_hospitals_filter_type_private(self, client):
        """hospital_type=private returns only private hospitals."""
        resp = await client.get("/api/v1/hospitals", params={"hospital_type": "private"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] > 0
        for hosp in data["hospitals"]:
            assert hosp["hospital_type"] == "private"

    @pytest.mark.asyncio
    async def test_list_hospitals_filter_accepts_pmjay_true(self, client):
        """accepts_pmjay=true filters to PMJAY-accepting hospitals only."""
        resp = await client.get("/api/v1/hospitals", params={"accepts_pmjay": "true"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] > 0
        for hosp in data["hospitals"]:
            assert hosp["accepts_pmjay"] is True

    @pytest.mark.asyncio
    async def test_list_hospitals_filter_accepts_pmjay_false(self, client):
        """accepts_pmjay=false filters to non-PMJAY hospitals only."""
        resp = await client.get("/api/v1/hospitals", params={"accepts_pmjay": "false"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] > 0
        for hosp in data["hospitals"]:
            assert hosp["accepts_pmjay"] is False

    @pytest.mark.asyncio
    async def test_list_hospitals_pagination_page1(self, client):
        """Page 1 with per_page=5 returns at most 5 hospitals."""
        resp = await client.get("/api/v1/hospitals", params={"page": 1, "per_page": 5})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["hospitals"]) <= 5
        assert data["page"] == 1
        assert data["per_page"] == 5

    @pytest.mark.asyncio
    async def test_list_hospitals_pagination_page2(self, client):
        """Page 2 returns the next chunk of hospitals."""
        resp = await client.get("/api/v1/hospitals", params={"page": 2, "per_page": 5})
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 2

    @pytest.mark.asyncio
    async def test_list_hospitals_pagination_beyond_total(self, client):
        """Requesting a page beyond total results returns empty list."""
        resp = await client.get("/api/v1/hospitals", params={"page": 999, "per_page": 50})
        assert resp.status_code == 200
        data = resp.json()
        assert data["hospitals"] == []

    @pytest.mark.asyncio
    async def test_list_hospitals_combined_filter_city_and_pmjay(self, client):
        """Combined city + PMJAY filter narrows results correctly."""
        resp = await client.get(
            "/api/v1/hospitals",
            params={"city": "Pune", "accepts_pmjay": "true"},
        )
        assert resp.status_code == 200
        data = resp.json()
        for hosp in data["hospitals"]:
            assert hosp["city"].lower() == "pune"
            assert hosp["accepts_pmjay"] is True

    @pytest.mark.asyncio
    async def test_list_hospitals_invalid_page_rejected(self, client):
        """page < 1 should trigger 422 validation error."""
        resp = await client.get("/api/v1/hospitals", params={"page": 0})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_list_hospitals_per_page_too_large_rejected(self, client):
        """per_page > 50 should trigger 422 validation error."""
        resp = await client.get("/api/v1/hospitals", params={"per_page": 100})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_list_hospitals_invalid_type_rejected(self, client):
        """Invalid hospital_type value should trigger 422."""
        resp = await client.get("/api/v1/hospitals", params={"hospital_type": "luxury"})
        assert resp.status_code == 422


class TestHospitalDetailEndpoint:

    @pytest.mark.asyncio
    async def test_get_hospital_valid_id(self, client):
        """Fetching hosp-001 returns the correct hospital record."""
        resp = await client.get("/api/v1/hospitals/hosp-001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "hosp-001"
        assert "name" in data
        assert "city" in data

    @pytest.mark.asyncio
    async def test_get_hospital_ruby_hall_details(self, client):
        """Ruby Hall Clinic record should have expected fields."""
        resp = await client.get("/api/v1/hospitals/hosp-001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Ruby Hall Clinic"
        assert data["city"] == "Pune"
        assert "accreditation" in data
        assert "procedures_offered" in data

    @pytest.mark.asyncio
    async def test_get_hospital_government_sassoon(self, client):
        """Sassoon General Hospital (hosp-002) should accept PMJAY."""
        resp = await client.get("/api/v1/hospitals/hosp-002")
        assert resp.status_code == 200
        data = resp.json()
        assert data["accepts_pmjay"] is True
        assert data["hospital_type"] == "government"

    @pytest.mark.asyncio
    async def test_get_hospital_invalid_id_returns_404(self, client):
        """Non-existent hospital ID must return 404."""
        resp = await client.get("/api/v1/hospitals/hosp-999")
        assert resp.status_code == 404
        detail = resp.json()["detail"]
        assert "hosp-999" in detail

    @pytest.mark.asyncio
    async def test_get_hospital_aiims_delhi(self, client):
        """AIIMS Delhi (hosp-013) is the last synthetic record."""
        resp = await client.get("/api/v1/hospitals/hosp-013")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "AIIMS Delhi"
        assert data["city"] == "Delhi"
        assert data["accepts_pmjay"] is True

    @pytest.mark.asyncio
    async def test_get_hospital_mumbai_kokilaben(self, client):
        """Kokilaben hospital (hosp-011) is in Mumbai."""
        resp = await client.get("/api/v1/hospitals/hosp-011")
        assert resp.status_code == 200
        data = resp.json()
        assert data["city"] == "Mumbai"
        assert data["hospital_type"] == "private"
