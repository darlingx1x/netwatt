import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from sqlalchemy import text

from netwatt.audit.router import router as audit_router
from netwatt.auth.router import router as auth_router
from netwatt.auth.sessions_router import router as sessions_router
from netwatt.catalog.router import router as catalog_router
from netwatt.db import SessionLocal
from netwatt.middleware import AuditMiddleware, RateLimitMiddleware
from netwatt.reports.router import router as reports_router
from netwatt.scenarios.router import router as scenarios_router
from netwatt.settings import settings
from netwatt.users.router import router as users_router


structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

REQUESTS_TOTAL = Counter(
    "netwatt_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    structlog.get_logger().info("netwatt.startup", env=settings.env)
    yield
    structlog.get_logger().info("netwatt.shutdown")


app = FastAPI(title="NetWatt API", version="0.1.0", lifespan=lifespan)

app.add_middleware(AuditMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(catalog_router)
app.include_router(scenarios_router)
app.include_router(reports_router)
app.include_router(users_router)
app.include_router(audit_router)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
async def readyz() -> dict[str, str]:
    async with SessionLocal() as session:
        await session.execute(text("SELECT 1"))
    return {"status": "ready"}


@app.get("/api/version")
async def version() -> dict[str, str]:
    return {"version": "0.1.0", "env": settings.env}


@app.get("/api/metrics")
async def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.middleware("http")
async def count_requests(request, call_next):  # type: ignore[no-untyped-def]
    response = await call_next(request)
    try:
        REQUESTS_TOTAL.labels(
            method=request.method,
            path=request.url.path,
            status=str(response.status_code),
        ).inc()
    except Exception:
        pass
    return response
