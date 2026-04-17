from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from netwatt.auth.models import AuthToken
from netwatt.auth.schemas import RegisterReq
from netwatt.auth.service import register
from netwatt.catalog.models import Equipment
from netwatt.users.models import User


@pytest_asyncio.fixture(autouse=True)
async def _clean(session: AsyncSession) -> AsyncIterator[None]:
    await session.execute(delete(AuthToken))
    await session.execute(delete(Equipment))
    await session.execute(delete(User))
    await session.commit()
    yield
    await session.execute(delete(AuthToken))
    await session.execute(delete(Equipment))
    await session.execute(delete(User))
    await session.commit()


@pytest_asyncio.fixture()
async def admin_headers(client: AsyncClient, session: AsyncSession) -> dict[str, str]:
    await register(
        session,
        RegisterReq(email="a@e.com", full_name="A", password="pass1234", role="admin"),
    )
    await session.commit()
    r = await client.post("/api/auth/login", json={"email": "a@e.com", "password": "pass1234"})
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}


@pytest_asyncio.fixture()
async def engineer_headers(client: AsyncClient, session: AsyncSession) -> dict[str, str]:
    await register(
        session,
        RegisterReq(email="e@e.com", full_name="E", password="pass1234", role="engineer"),
    )
    await session.commit()
    r = await client.post("/api/auth/login", json={"email": "e@e.com", "password": "pass1234"})
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}


@pytest_asyncio.fixture()
async def cisco(session: AsyncSession) -> Equipment:
    eq = Equipment(
        vendor="Cisco",
        model="Test-1",
        category="access_switch",
        ports_total=24,
        poe_ports=24,
        poe_budget_w=370,
        p_idle_w=45,
        p_max_w=435,
        eee_supported=True,
        alr_supported=True,
        poe_scheduling=True,
    )
    session.add(eq)
    await session.commit()
    return eq


@pytest.mark.asyncio()
async def test_list_requires_auth(client: AsyncClient) -> None:
    r = await client.get("/api/equipment")
    assert r.status_code == 401


@pytest.mark.asyncio()
async def test_list_empty(client: AsyncClient, engineer_headers: dict[str, str]) -> None:
    r = await client.get("/api/equipment", headers=engineer_headers)
    assert r.status_code == 200
    assert r.json() == {"items": [], "total": 0, "offset": 0, "limit": 100}


@pytest.mark.asyncio()
async def test_filter_by_vendor(
    client: AsyncClient, engineer_headers: dict[str, str], cisco: Equipment
) -> None:
    r = await client.get("/api/equipment?vendor=Cisco", headers=engineer_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 1
    assert data["items"][0]["vendor"] == "Cisco"


@pytest.mark.asyncio()
async def test_search_q(
    client: AsyncClient, engineer_headers: dict[str, str], cisco: Equipment
) -> None:
    r = await client.get("/api/equipment?q=Test", headers=engineer_headers)
    assert r.json()["total"] == 1
    r = await client.get("/api/equipment?q=Zzz", headers=engineer_headers)
    assert r.json()["total"] == 0


@pytest.mark.asyncio()
async def test_engineer_cannot_create(
    client: AsyncClient, engineer_headers: dict[str, str]
) -> None:
    payload = {
        "vendor": "X",
        "model": "Y",
        "category": "access_switch",
        "p_idle_w": 10,
        "p_max_w": 20,
    }
    r = await client.post("/api/equipment", json=payload, headers=engineer_headers)
    assert r.status_code == 403


@pytest.mark.asyncio()
async def test_admin_create_update_delete(
    client: AsyncClient, admin_headers: dict[str, str]
) -> None:
    create = await client.post(
        "/api/equipment",
        json={
            "vendor": "ACME",
            "model": "One",
            "category": "router",
            "p_idle_w": 50,
            "p_max_w": 120,
        },
        headers=admin_headers,
    )
    assert create.status_code == 201
    eq_id = create.json()["id"]

    patch = await client.patch(
        f"/api/equipment/{eq_id}",
        json={"p_max_w": 150},
        headers=admin_headers,
    )
    assert patch.status_code == 200
    assert float(patch.json()["p_max_w"]) == 150

    delete_ = await client.delete(f"/api/equipment/{eq_id}", headers=admin_headers)
    assert delete_.status_code == 204

    after = await client.get(f"/api/equipment/{eq_id}", headers=admin_headers)
    assert after.status_code == 404
