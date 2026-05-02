"""
HealthAssist Backend — FastAPI Application Entry Point

Initializes:
  - FastAPI app with metadata, lifespan context
  - CORS middleware
  - Rate limiting (slowapi)
  - Global exception handlers
  - All API v1 routers
  - Health check endpoint
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.getLevelName(settings.LOG_LEVEL),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
        structlog.dev.ConsoleRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger(__name__)


# ── Rate Limiter ──────────────────────────────────────────────────────────────
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
    from slowapi.util import get_remote_address
    limiter = Limiter(key_func=get_remote_address)
    SLOWAPI_AVAILABLE = True
except ImportError:
    limiter = None
    SLOWAPI_AVAILABLE = False
    logger.warning("slowapi not available — rate limiting disabled")


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup / shutdown lifecycle manager."""
    logger.info("HealthAssist API starting up", env=settings.APP_ENV)

    # Initialize database
    from app.dependencies import init_db, _try_connect_redis
    await init_db()

    # Try Redis (optional — fails gracefully)
    await _try_connect_redis()

    logger.info("HealthAssist API startup complete — ready to serve requests")
    yield

    # Shutdown
    from app.dependencies import close_db
    await close_db()
    logger.info("HealthAssist API shut down cleanly")


# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="HealthAssist — Healthcare Navigator API",
    description=(
        "AI-powered healthcare cost estimation, hospital discovery, "
        "PMJAY eligibility checking, and drug comparison for India. "
        "Built with FastAPI + SQLite/PostgreSQL + Redis + LLM.\n\n"
        "**Dev mode**: Uses SQLite (no PostgreSQL needed). "
        "Set `USE_SQLITE=false` and configure `DATABASE_URL` for production."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


# ── Middleware ────────────────────────────────────────────────────────────────
if SLOWAPI_AVAILABLE and limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request Timing Middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Process-Time-Ms"] = str(elapsed)
    return response


# ── Global Exception Handlers ─────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error", path=str(request.url))
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Request validation failed. Please check your input.",
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception", error=str(exc), path=str(request.url))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"message": "An internal server error occurred. Please try again later."},
    )


# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.v1 import search, hospitals, cost, pmjay, drugs, triage  # noqa: E402

PREFIX = settings.API_V1_PREFIX

app.include_router(search.router,    prefix=PREFIX, tags=["Search"])
app.include_router(hospitals.router, prefix=PREFIX, tags=["Hospitals"])
app.include_router(cost.router,      prefix=PREFIX, tags=["Cost Estimation"])
app.include_router(pmjay.router,     prefix=PREFIX, tags=["PMJAY"])
app.include_router(drugs.router,     prefix=PREFIX, tags=["Drugs"])
app.include_router(triage.router,    prefix=PREFIX, tags=["Triage"])


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"], summary="Health check")
async def health_check():
    from app.dependencies import _redis_available
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "env": settings.APP_ENV,
        "database": "sqlite" if settings.USE_SQLITE else "postgresql",
        "redis": "connected" if _redis_available else "not available (caching disabled)",
        "synthetic_data": settings.ENABLE_SYNTHETIC_DATA,
    }


@app.get("/", tags=["System"], summary="API root")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": "/health",
        "version": "1.0.0",
        "endpoints": {
            "search": f"{settings.API_V1_PREFIX}/search",
            "hospitals": f"{settings.API_V1_PREFIX}/hospitals",
            "cost_estimate": f"{settings.API_V1_PREFIX}/cost-estimate",
            "pmjay_check": f"{settings.API_V1_PREFIX}/pmjay-check",
            "drug_compare": f"{settings.API_V1_PREFIX}/drugs/compare?name=atorvastatin",
            "triage": f"{settings.API_V1_PREFIX}/triage",
        },
    }
