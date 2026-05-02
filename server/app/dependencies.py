"""
HealthAssist Backend — Dependency Injection
Provides: async DB session, Redis client (optional), current user, rate limiter

Dev mode:  USE_SQLITE=true  → aiosqlite (no PostgreSQL/asyncpg needed)
Prod mode: USE_SQLITE=false → asyncpg + PostgreSQL
"""

from __future__ import annotations

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings

logger = structlog.get_logger(__name__)

# ── Database Engine ───────────────────────────────────────────────────────────
_engine = None
_async_session_factory = None


async def init_db() -> None:
    """
    Create async DB engine and tables on startup.
    SQLite mode: uses aiosqlite, creates tables automatically.
    PostgreSQL mode: uses asyncpg, expects Alembic migrations.
    """
    global _engine, _async_session_factory

    if settings.USE_SQLITE:
        db_url = settings.SQLITE_URL
        connect_args = {"check_same_thread": False}
        logger.info("Database mode: SQLite (dev)", db_url=db_url)
    else:
        db_url = settings.DATABASE_URL
        connect_args = {}
        logger.info("Database mode: PostgreSQL (production)")

    _engine = create_async_engine(
        db_url,
        echo=settings.DEBUG,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

    _async_session_factory = async_sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # In SQLite mode, auto-create all tables (no Alembic needed for dev)
    if settings.USE_SQLITE:
        try:
            from app.models.base import Base
            # Import all models so metadata knows about them
            from app.models import hospital, procedure, cost_benchmark, drug  # noqa
            async with _engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("SQLite tables created successfully")
        except Exception as e:
            logger.warning("Could not auto-create SQLite tables", error=str(e))


async def close_db() -> None:
    """Dispose engine on shutdown."""
    global _engine
    if _engine:
        await _engine.dispose()
        logger.info("Database engine disposed")


async def get_db() -> AsyncSession:
    """FastAPI dependency: yields an async DB session per request."""
    if _async_session_factory is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Redis Client (Optional) ───────────────────────────────────────────────────
_redis_client = None
_redis_available = False


async def _try_connect_redis() -> None:
    """Attempt to connect to Redis. Silently skip if not available."""
    global _redis_client, _redis_available
    try:
        import redis.asyncio as aioredis
        client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
        )
        await client.ping()
        _redis_client = client
        _redis_available = True
        logger.info("Redis connected successfully", url=settings.REDIS_URL)
    except Exception as e:
        _redis_available = False
        logger.warning(
            "Redis not available — caching disabled for this session. "
            "Start Redis or set REDIS_URL to enable caching.",
            error=str(e),
        )


async def get_redis():
    """
    FastAPI dependency: returns Redis client if available, else None.
    Callers must handle None gracefully (cache miss = regenerate).
    """
    return _redis_client if _redis_available else None


# ── Auth ──────────────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/token",
    auto_error=False,
)


async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict | None:
    """
    Optional auth dependency.
    Returns decoded token payload or None if no token provided.
    Raises 401 if token is present but invalid/expired.
    """
    if token is None:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
