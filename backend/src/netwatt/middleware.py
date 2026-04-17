from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Callable
from typing import Awaitable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from netwatt.audit.service import record as record_audit
from netwatt.auth.service import resolve_access
from netwatt.db import SessionLocal
from netwatt.settings import settings


class AuditMiddleware(BaseHTTPMiddleware):
    """Logs POST/PATCH/DELETE actions to audit_log table."""

    TRACKED_METHODS = {"POST", "PATCH", "DELETE", "PUT"}

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        if settings.env == "test":
            return response
        if (
            request.method not in self.TRACKED_METHODS
            or response.status_code >= 400
            or request.url.path.startswith("/api/metrics")
            or request.url.path == "/api/auth/login"
            or request.url.path == "/api/auth/refresh"
            or request.url.path == "/api/auth/logout"
        ):
            return response
        auth = request.headers.get("authorization", "")
        user_id: int | None = None
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
            try:
                async with SessionLocal() as session:
                    user = await resolve_access(session, token)
                    if user is not None:
                        user_id = user.id
            except Exception:
                pass
        try:
            async with SessionLocal() as session:
                path_parts = request.url.path.strip("/").split("/")
                entity = path_parts[1] if len(path_parts) > 1 else "unknown"
                await record_audit(
                    session,
                    user_id=user_id,
                    action=request.method,
                    entity=entity,
                    meta={"path": request.url.path, "status": response.status_code},
                )
                await session.commit()
        except Exception:
            pass
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limit on /api/auth/login: 10 per minute per IP."""

    WINDOW_SECONDS = 60
    MAX_ATTEMPTS = 10
    _hits: dict[str, list[float]] = defaultdict(list)

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if settings.env == "test":
            return await call_next(request)
        if request.url.path == "/api/auth/login" and request.method == "POST":
            ip = (
                request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                or (request.client.host if request.client else "unknown")
            )
            now = time.time()
            hits = [t for t in self._hits[ip] if now - t < self.WINDOW_SECONDS]
            if len(hits) >= self.MAX_ATTEMPTS:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "too_many_login_attempts"},
                )
            hits.append(now)
            self._hits[ip] = hits
        return await call_next(request)
