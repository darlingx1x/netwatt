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
from netwatt.scenarios.models import Scenario
from netwatt.users.models import User


@pytest_asyncio.fixture(autouse=True)
async def _clean(session: AsyncSession) -> AsyncIterator[None]:
    await session.execute(delete(AuthToken))
    await session.execute(delete(Scenario))
    await session.execute(delete(Equipment))
    await session.execute(delete(User))
    await session.commit()
    yield


async def _login(client: AsyncClient, email: str, password: str) -> dict[str, str]:
    r = await client.post("/api/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}


@pytest_asyncio.fixture()
async def engineer_headers(
    client: AsyncClient, session: AsyncSession
) -> dict[str, str]:
    await register(
        session,
        RegisterReq(email="e1@x.com", full_name="E1", password="pass1234", role="engineer"),
    )
    await session.commit()
    return await _login(client, "e1@x.com", "pass1234")


@pytest_asyncio.fixture()
async def other_engineer_headers(
    client: AsyncClient, session: AsyncSession
) -> dict[str, str]:
    await register(
        session,
        RegisterReq(email="e2@x.com", full_name="E2", password="pass1234", role="engineer"),
    )
    await session.commit()
    return await _login(client, "e2@x.com", "pass1234")


@pytest_asyncio.fixture()
async def admin_headers(
    client: AsyncClient, session: AsyncSession
) -> dict[str, str]:
    await register(
        session,
        RegisterReq(email="a@x.com", full_name="A", password="pass1234", role="admin"),
    )
    await session.commit()
    return await _login(client, "a@x.com", "pass1234")


@pytest_asyncio.fixture()
async def switch(session: AsyncSession) -> Equipment:
    eq = Equipment(
        vendor="Cisco",
        model="Test",
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


def _base_payload(equipment_id: int) -> dict:
    return {
        "name": "Test Scenario",
        "notes": "",
        "tariff": {"day": 1050, "peak": 1450, "night": 450, "currency": "UZS"},
        "traffic": {
            "day_util": 0.35,
            "peak_util": 0.7,
            "night_util": 0.05,
            "day_hours": 6,
            "peak_hours": 2,
            "night_hours": 16,
        },
        "policies": {
            "eee": {"enabled": True, "eta": 0.5},
            "alr": {"enabled": True, "drop": 0.4},
            "poe_sched": {"enabled": True, "off_hours": 12},
            "consolidation": {"enabled": False},
        },
        "ef_grid": 0.468,
        "items": [{"equipment_id": equipment_id, "quantity": 6, "location": "office"}],
    }


@pytest.mark.asyncio()
async def test_create_scenario(
    client: AsyncClient, engineer_headers: dict[str, str], switch: Equipment
) -> None:
    r = await client.post(
        "/api/scenarios", json=_base_payload(switch.id), headers=engineer_headers
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Test Scenario"
    assert body["status"] == "draft"
    assert len(body["items"]) == 1


@pytest.mark.asyncio()
async def test_list_only_own(
    client: AsyncClient,
    engineer_headers: dict[str, str],
    other_engineer_headers: dict[str, str],
    switch: Equipment,
) -> None:
    await client.post("/api/scenarios", json=_base_payload(switch.id), headers=engineer_headers)
    r1 = await client.get("/api/scenarios", headers=engineer_headers)
    r2 = await client.get("/api/scenarios", headers=other_engineer_headers)
    assert len(r1.json()) == 1
    assert len(r2.json()) == 0


@pytest.mark.asyncio()
async def test_engineer_cannot_access_other_scenario(
    client: AsyncClient,
    engineer_headers: dict[str, str],
    other_engineer_headers: dict[str, str],
    switch: Equipment,
) -> None:
    r = await client.post(
        "/api/scenarios", json=_base_payload(switch.id), headers=engineer_headers
    )
    sid = r.json()["id"]
    forbidden = await client.get(f"/api/scenarios/{sid}", headers=other_engineer_headers)
    assert forbidden.status_code == 403


@pytest.mark.asyncio()
async def test_admin_can_access_any(
    client: AsyncClient,
    engineer_headers: dict[str, str],
    admin_headers: dict[str, str],
    switch: Equipment,
) -> None:
    r = await client.post(
        "/api/scenarios", json=_base_payload(switch.id), headers=engineer_headers
    )
    sid = r.json()["id"]
    ok = await client.get(f"/api/scenarios/{sid}", headers=admin_headers)
    assert ok.status_code == 200
    lst = await client.get("/api/scenarios", headers=admin_headers)
    assert len(lst.json()) == 1


@pytest.mark.asyncio()
async def test_update_resets_status(
    client: AsyncClient, engineer_headers: dict[str, str], switch: Equipment
) -> None:
    r = await client.post(
        "/api/scenarios", json=_base_payload(switch.id), headers=engineer_headers
    )
    sid = r.json()["id"]
    upd = await client.patch(
        f"/api/scenarios/{sid}",
        json={"name": "Renamed"},
        headers=engineer_headers,
    )
    assert upd.status_code == 200
    assert upd.json()["name"] == "Renamed"
    assert upd.json()["status"] == "draft"


@pytest.mark.asyncio()
async def test_add_and_remove_item(
    client: AsyncClient, engineer_headers: dict[str, str], switch: Equipment
) -> None:
    r = await client.post(
        "/api/scenarios", json=_base_payload(switch.id), headers=engineer_headers
    )
    sid = r.json()["id"]
    add = await client.post(
        f"/api/scenarios/{sid}/items",
        json={"equipment_id": switch.id, "quantity": 3, "location": "branch"},
        headers=engineer_headers,
    )
    assert add.status_code == 201
    item_id = add.json()["id"]
    rm = await client.delete(f"/api/scenarios/{sid}/items/{item_id}", headers=engineer_headers)
    assert rm.status_code == 204


@pytest.mark.asyncio()
async def test_delete_scenario(
    client: AsyncClient, engineer_headers: dict[str, str], switch: Equipment
) -> None:
    r = await client.post(
        "/api/scenarios", json=_base_payload(switch.id), headers=engineer_headers
    )
    sid = r.json()["id"]
    d = await client.delete(f"/api/scenarios/{sid}", headers=engineer_headers)
    assert d.status_code == 204
    after = await client.get(f"/api/scenarios/{sid}", headers=engineer_headers)
    assert after.status_code == 404
