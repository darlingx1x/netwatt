from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from netwatt.auth.models import AuthToken
from netwatt.auth.schemas import RegisterReq
from netwatt.auth.security import (
    hash_password,
    random_token,
    sha256_hex,
    verify_password,
)
from netwatt.settings import settings
from netwatt.users.models import User


class AuthError(Exception):
    pass


async def register(session: AsyncSession, req: RegisterReq) -> User:
    existing = await session.scalar(select(User).where(User.email == req.email))
    if existing is not None:
        raise AuthError("email_taken")
    user = User(
        email=req.email,
        full_name=req.full_name,
        password_hash=hash_password(req.password),
        role=req.role,
        lang=req.lang,
    )
    session.add(user)
    await session.flush()
    return user


async def authenticate(session: AsyncSession, email: str, password: str) -> User:
    user = await session.scalar(select(User).where(User.email == email))
    if user is None or not user.is_active:
        raise AuthError("invalid_credentials")
    if not verify_password(password, user.password_hash):
        raise AuthError("invalid_credentials")
    return user


async def issue_pair(
    session: AsyncSession,
    user: User,
    ip: str | None,
    user_agent: str | None,
    parent_refresh_id: int | None = None,
) -> tuple[str, str]:
    access_raw = random_token()
    refresh_raw = random_token()
    now = datetime.now(timezone.utc)
    access = AuthToken(
        user_id=user.id,
        kind="access",
        token_hash=sha256_hex(access_raw),
        expires_at=now + timedelta(seconds=settings.auth_access_ttl_sec),
        ip=ip,
        user_agent=user_agent,
    )
    refresh = AuthToken(
        user_id=user.id,
        kind="refresh",
        token_hash=sha256_hex(refresh_raw),
        expires_at=now + timedelta(days=settings.auth_refresh_ttl_days),
        ip=ip,
        user_agent=user_agent,
        parent_id=parent_refresh_id,
    )
    session.add_all([access, refresh])
    await session.flush()
    return access_raw, refresh_raw


async def rotate_refresh(
    session: AsyncSession,
    refresh_raw: str,
    ip: str | None,
    user_agent: str | None,
) -> tuple[User, str, str]:
    token_hash = sha256_hex(refresh_raw)
    row = await session.scalar(
        select(AuthToken).where(
            AuthToken.token_hash == token_hash, AuthToken.kind == "refresh"
        )
    )
    if row is None:
        raise AuthError("refresh_not_found")
    now = datetime.now(timezone.utc)
    if row.revoked_at is not None:
        # reuse detection — revoke all for this user and persist before raising
        await session.execute(
            update(AuthToken)
            .where(AuthToken.user_id == row.user_id, AuthToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
        await session.commit()
        raise AuthError("refresh_reused")
    if row.expires_at <= now:
        raise AuthError("refresh_expired")

    row.revoked_at = now
    user = await session.get(User, row.user_id)
    if user is None or not user.is_active:
        raise AuthError("user_inactive")
    access, refresh = await issue_pair(session, user, ip, user_agent, parent_refresh_id=row.id)
    return user, access, refresh


async def revoke_access(session: AsyncSession, access_raw: str) -> None:
    token_hash = sha256_hex(access_raw)
    await session.execute(
        update(AuthToken)
        .where(AuthToken.token_hash == token_hash, AuthToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )


async def revoke_all_for_user(session: AsyncSession, user_id: int) -> None:
    await session.execute(
        update(AuthToken)
        .where(AuthToken.user_id == user_id, AuthToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )


async def resolve_access(session: AsyncSession, access_raw: str) -> User | None:
    token_hash = sha256_hex(access_raw)
    row = await session.scalar(
        select(AuthToken).where(
            AuthToken.token_hash == token_hash, AuthToken.kind == "access"
        )
    )
    if row is None or row.revoked_at is not None:
        return None
    if row.expires_at <= datetime.now(timezone.utc):
        return None
    user = await session.get(User, row.user_id)
    if user is None or not user.is_active:
        return None
    return user
