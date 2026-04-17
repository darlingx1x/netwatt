from typing import Annotated

from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from netwatt.auth.service import resolve_access
from netwatt.db import get_session
from netwatt.errors import forbidden, unauthorized
from netwatt.users.models import User

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def current_user(
    session: SessionDep,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise unauthorized("missing_token")
    token = authorization.split(" ", 1)[1].strip()
    user = await resolve_access(session, token)
    if user is None:
        raise unauthorized("invalid_or_expired_token")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


async def admin_user(user: CurrentUser) -> User:
    if user.role != "admin":
        raise forbidden("admin_only")
    return user


AdminUser = Annotated[User, Depends(admin_user)]


def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def client_ua(request: Request) -> str | None:
    return request.headers.get("user-agent")
