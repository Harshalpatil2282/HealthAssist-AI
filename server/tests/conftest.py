"""
HealthAssist Tests — pytest configuration and shared fixtures
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config import settings


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client for the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.fixture
def search_payload():
    """Standard search request payload."""
    return {
        "query": "knee replacement in Pune, diabetic, 62 years",
        "location": {"pincode": "411001"},
        "radius_km": 30,
        "patient_age": 62,
        "comorbidities": ["diabetes"],
        "hospital_type": "both",
        "language": "en",
    }


@pytest.fixture
def pmjay_bpl_payload():
    return {
        "state": "Maharashtra",
        "annual_income": 180000,
        "ration_card_type": "BPL",
        "family_size": 4,
    }


@pytest.fixture
def pmjay_apl_rich_payload():
    return {
        "state": "Maharashtra",
        "annual_income": 800000,
        "ration_card_type": "APL",
        "family_size": 2,
    }
