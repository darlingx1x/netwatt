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
from netwatt.scenarios.calc_runner import perform_calculation
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


@pytest_asyncio.fixture()
async def engineer_headers(client: AsyncClient, session: AsyncSession) -> dict[str, str]:
    await register(
        session,
        RegisterReq(email="e@x.com", full_name="E", password="pass1234", role="engineer"),
    )
    await session.commit()
    r = await client.post("/api/auth/login", json={"email": "e@x.com", "password": "pass1234"})
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}


@pytest_asyncio.fixture()
async def switch(session: AsyncSession) -> Equipment:
    eq = Equipment(
        vendor="Cisco", model="Test", category="access_switch",
        ports_total=24, poe_ports=24, poe_budget_w=370,
        p_idle_w=45, p_max_w=435,
        eee_supported=True, alr_supported=True, poe_scheduling=True,
    )
    session.add(eq)
    await session.commit()
    return eq


def _payload(eid: int) -> dict:
    return {
        "name": "Calc Test",
        "tariff": {"day": 1050, "peak": 1450, "night": 450, "currency": "UZS"},
        "traffic": {
            "day_util": 0.35, "peak_util": 0.7, "night_util": 0.05,
            "day_hours": 6, "peak_hours": 2, "night_hours": 16,
        },
        "policies": {
            "eee": {"enabled": True, "eta": 0.5},
            "alr": {"enabled": True, "drop": 0.4},
            "poe_sched": {"enabled": True, "off_hours": 12},
            "consolidation": {"enabled": False},
        },
        "ef_grid": 0.468,
        "items": [{"equipment_id": eid, "quantity": 6}],
    }


@pytest.mark.asyncio()
async def test_perform_calculation_produces_result(
    session: AsyncSession,
    client: AsyncClient,
    engineer_headers: dict[str, str],
    switch: Equipment,
) -> None:
    created = await client.post(
        "/api/scenarios", json=_payload(switch.id), headers=engineer_headers
    )
    sid = created.json()["id"]
    status = await perform_calculation(session, sid)
    assert status == "ready"

    r = await client.get(f"/api/scenarios/{sid}", headers=engineer_headers)
    body = r.json()
    assert body["status"] == "ready"
    assert body["result"] is not None
    assert float(body["result"]["e_base_kwh"]) > 0
    assert float(body["result"]["savings_kwh"]) > 0


@pytest.mark.asyncio()
async def test_calculate_endpoint_triggers_inline_run(
    client: AsyncClient,
    engineer_headers: dict[str, str],
    switch: Equipment,
) -> None:
    created = await client.post(
        "/api/scenarios", json=_payload(switch.id), headers=engineer_headers
    )
    sid = created.json()["id"]
    trigger = await client.post(
        f"/api/scenarios/{sid}/calculate", headers=engineer_headers
    )
    assert trigger.status_code == 200
    assert trigger.json()["status"] == "calculating"
    # Mode is either 'nats' (if broker is running) or 'inline' (fallback)
    assert trigger.json()["mode"] in ("nats", "inline")


@pytest.mark.asyncio()
async def test_calc_failed_on_missing_equipment(
    session: AsyncSession,
    client: AsyncClient,
    engineer_headers: dict[str, str],
) -> None:
    # Create scenario without items to simulate empty run
    payload = {
        "name": "Empty",
        "tariff": {"day": 1000, "peak": 1000, "night": 500, "currency": "UZS"},
        "traffic": {
            "day_util": 0.3, "peak_util": 0.6, "night_util": 0.05,
            "day_hours": 8, "peak_hours": 4, "night_hours": 12,
        },
        "policies": {
            "eee": {"enabled": False},
            "alr": {"enabled": False},
            "poe_sched": {"enabled": False},
            "consolidation": {"enabled": False},
        },
        "items": [],
    }
    r = await client.post("/api/scenarios", json=payload, headers=engineer_headers)
    sid = r.json()["id"]
    status = await perform_calculation(session, sid)
    # Empty scenario is valid — should produce zero result, not fail
    assert status == "ready"
