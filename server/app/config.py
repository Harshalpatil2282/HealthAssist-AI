"""
HealthAssist Backend — Application Settings
Uses pydantic-settings v2 to load config from environment / .env file
"""

from __future__ import annotations

from functools import lru_cache
from typing import List, Optional

from pydantic import Field, AnyUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "HealthAssist"
    APP_ENV: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api/v1"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://healthassist:healthassist@localhost:5432/healthassist_db"
    )
    USE_SQLITE: bool = False
    SQLITE_URL: str = "sqlite+aiosqlite:///./healthassist_dev.db"

    @property
    def effective_database_url(self) -> str:
        return self.SQLITE_URL if self.USE_SQLITE else self.DATABASE_URL

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── LLM ───────────────────────────────────────────────────────────────────
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o"
    LLM_FALLBACK_MODEL: str = "claude-3-5-sonnet-20241022"
    LLM_MAX_TOKENS: int = 1024
    LLM_TEMPERATURE: float = 0.1

    # ── External APIs ─────────────────────────────────────────────────────────
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = None

    # ── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-to-a-32-char-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── CORS ──────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_PER_MINUTE: int = 10

    # ── Feature Flags ─────────────────────────────────────────────────────────
    ENABLE_SYNTHETIC_DATA: bool = True
    ENABLE_TELEMEDICINE: bool = False
    ENABLE_CELERY: bool = False

    # ── Scoring Weights (configurable) ────────────────────────────────────────
    CLINICAL_WEIGHT: float = 0.30
    REPUTATION_WEIGHT: float = 0.25
    ACCESSIBILITY_WEIGHT: float = 0.20
    AFFORDABILITY_WEIGHT: float = 0.25

    # ── Cost Engine ───────────────────────────────────────────────────────────
    CONFIDENCE_MIN: float = 0.30
    CONFIDENCE_MAX: float = 0.95


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton — call this everywhere."""
    return Settings()


settings = get_settings()
