from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from netwatt.auth.models import AuthToken
from netwatt.auth.schemas import RegisterReq
from netwatt.auth.service import register
from netwatt.users.models import User


@pytest_asyncio.fixture(autouse=True)
async def _clean(session: AsyncSession) -> AsyncIterator[None]:
    await session.execute(delete(AuthToken))
    await session.execute(delete(User))
    await session.commit()
    yield
    await session.execute(delete(AuthToken))
    await session.execute(delete(User))
    await session.commit()


@pytest_asyncio.fixture()
async def admin(session: AsyncSession) -> User:
    user = await register(
        session,
        RegisterReq(
            email="admin@example.com",
            full_name="Admin",
            password="admin1234",
            role="admin",
        ),
    )
    await session.commit()
    return user


@pytest_asyncio.fixture()
async def engineer(session: AsyncSession) -> User:
    user = await register(
        session,
        RegisterReq(
            email="eng@example.com",
            full_name="Engineer",
            password="eng1234",
            role="engineer",
        ),
    )
    await session.commit()
    return user


@pytest.mark.asyncio()
async def test_login_returns_tokens(client: AsyncClient, engineer: User) -> None:
    r = await client.post(
        "/api/auth/login",
        json={"email": "eng@example.com", "password": "eng1234"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body["tokens"]
    assert "refresh_token" in body["tokens"]
    assert body["user"]["email"] == "eng@example.com"
    assert body["user"]["role"] == "engineer"


@pytest.mark.asyncio()
async def test_login_wrong_password_returns_401(client: AsyncClient, engineer: User) -> None:
    r = await client.post(
        "/api/auth/login",
        json={"email": "eng@example.com", "password": "bad"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio()
async def test_me_requires_bearer(client: AsyncClient) -> None:
    r = await client.get("/api/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio()
async def test_me_returns_user(client: AsyncClient, engineer: User) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "eng@example.com", "password": "eng1234"},
    )
    access = login.json()["tokens"]["access_token"]
    r = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200
    assert r.json()["email"] == "eng@example.com"


@pytest.mark.asyncio()
async def test_refresh_rotates(client: AsyncClient, engineer: User) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "eng@example.com", "password": "eng1234"},
    )
    refresh = login.json()["tokens"]["refresh_token"]
    r = await client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["refresh_token"] != refresh


@pytest.mark.asyncio()
async def test_refresh_reuse_detected(client: AsyncClient, engineer: User) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "eng@example.com", "password": "eng1234"},
    )
    refresh = login.json()["tokens"]["refresh_token"]
    r1 = await client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r1.status_code == 200
    r2 = await client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 401
    # Reuse must revoke new tokens too
    new_refresh = r1.json()["refresh_token"]
    r3 = await client.post("/api/auth/refresh", json={"refresh_token": new_refresh})
    assert r3.status_code == 401


@pytest.mark.asyncio()
async def test_logout_revokes_access(client: AsyncClient, engineer: User) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "eng@example.com", "password": "eng1234"},
    )
    access = login.json()["tokens"]["access_token"]
    r = await client.post("/api/auth/logout", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 204
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 401


@pytest.mark.asyncio()
async def test_register_requires_admin(client: AsyncClient, engineer: User) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "eng@example.com", "password": "eng1234"},
    )
    access = login.json()["tokens"]["access_token"]
    r = await client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "full_name": "New User",
            "password": "pass1234",
            "role": "engineer",
        },
        headers={"Authorization": f"Bearer {access}"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio()
async def test_admin_can_register(client: AsyncClient, admin: User) -> None:
    login = await client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "admin1234"},
    )
    access = login.json()["tokens"]["access_token"]
    r = await client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "full_name": "New User",
            "password": "pass1234",
            "role": "engineer",
        },
        headers={"Authorization": f"Bearer {access}"},
    )
    assert r.status_code == 201
    assert r.json()["email"] == "new@example.com"


@pytest.mark.asyncio()
async def test_expired_access_rejected(
    session: AsyncSession, client: AsyncClient, engineer: User
) -> None:
    from netwatt.auth.security import random_token, sha256_hex

    raw = random_token()
    session.add(
        AuthToken(
            user_id=engineer.id,
            kind="access",
            token_hash=sha256_hex(raw),
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
        )
    )
    await session.commit()
    r = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw}"})
    assert r.status_code == 401
