import asyncio
import json
import logging

from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import StreamingResponse

from netwatt.db import SessionLocal
from netwatt.deps import CurrentUser, SessionDep
from netwatt.errors import bad_request, forbidden, not_found
from netwatt.nats_bus.client import bus
from netwatt.scenarios.calc_runner import perform_calculation
from netwatt.scenarios.schemas import (
    ScenarioCreate,
    ScenarioItemCreate,
    ScenarioItemRead,
    ScenarioRead,
    ScenarioUpdate,
)
from netwatt.scenarios.service import (
    ScenarioError,
    add_item,
    create_scenario,
    delete_scenario,
    get_scenario,
    list_scenarios,
    remove_item,
    update_scenario,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


def _check_owner(scenario, user) -> None:  # type: ignore[no-untyped-def]
    if scenario.owner_id != user.id and user.role != "admin":
        raise forbidden("not_scenario_owner")


@router.get("", response_model=list[ScenarioRead])
async def api_list(
    session: SessionDep, user: CurrentUser
) -> list[ScenarioRead]:
    rows = await list_scenarios(session, user, include_others=user.role == "admin")
    return [ScenarioRead.model_validate(r) for r in rows]


@router.post("", response_model=ScenarioRead, status_code=201)
async def api_create(
    data: ScenarioCreate, session: SessionDep, user: CurrentUser
) -> ScenarioRead:
    try:
        sc = await create_scenario(session, user, data)
    except ScenarioError as e:
        raise bad_request(str(e)) from e
    full = await get_scenario(session, sc.id)
    assert full is not None
    return ScenarioRead.model_validate(full)


@router.get("/{scenario_id}", response_model=ScenarioRead)
async def api_get(
    scenario_id: int, session: SessionDep, user: CurrentUser
) -> ScenarioRead:
    sc = await get_scenario(session, scenario_id)
    if sc is None:
        raise not_found("scenario_not_found")
    _check_owner(sc, user)
    return ScenarioRead.model_validate(sc)


@router.patch("/{scenario_id}", response_model=ScenarioRead)
async def api_update(
    scenario_id: int, data: ScenarioUpdate, session: SessionDep, user: CurrentUser
) -> ScenarioRead:
    sc = await get_scenario(session, scenario_id)
    if sc is None:
        raise not_found("scenario_not_found")
    _check_owner(sc, user)
    await update_scenario(session, sc, data)
    full = await get_scenario(session, sc.id)
    assert full is not None
    return ScenarioRead.model_validate(full)


@router.delete("/{scenario_id}", status_code=204)
async def api_delete(
    scenario_id: int, session: SessionDep, user: CurrentUser
) -> None:
    sc = await get_scenario(session, scenario_id)
    if sc is None:
        raise not_found("scenario_not_found")
    _check_owner(sc, user)
    await delete_scenario(session, sc)


@router.post("/{scenario_id}/items", response_model=ScenarioItemRead, status_code=201)
async def api_add_item(
    scenario_id: int,
    data: ScenarioItemCreate,
    session: SessionDep,
    user: CurrentUser,
) -> ScenarioItemRead:
    sc = await get_scenario(session, scenario_id)
    if sc is None:
        raise not_found("scenario_not_found")
    _check_owner(sc, user)
    try:
        item = await add_item(session, sc, data.equipment_id, data.quantity, data.location)
    except ScenarioError as e:
        raise bad_request(str(e)) from e
    return ScenarioItemRead.model_validate(item)


@router.delete("/{scenario_id}/items/{item_id}", status_code=204)
async def api_remove_item(
    scenario_id: int, item_id: int, session: SessionDep, user: CurrentUser
) -> None:
    sc = await get_scenario(session, scenario_id)
    if sc is None:
        raise not_found("scenario_not_found")
    _check_owner(sc, user)
    ok = await remove_item(session, sc, item_id)
    if not ok:
        raise not_found("item_not_found")


async def _run_calc_inline(scenario_id: int) -> None:
    async with SessionLocal() as session:
        await perform_calculation(session, scenario_id)


@router.post("/{scenario_id}/calculate")
async def api_calculate(
    scenario_id: int,
    session: SessionDep,
    user: CurrentUser,
    background: BackgroundTasks,
) -> dict:
    sc = await get_scenario(session, scenario_id)
    if sc is None:
        raise not_found("scenario_not_found")
    _check_owner(sc, user)
    sc.status = "calculating"
    await session.flush()
    await session.commit()

    try:
        await bus.publish_calc(scenario_id)
        mode = "nats"
    except Exception as e:
        logger.warning("NATS unavailable, running inline: %s", e)
        background.add_task(_run_calc_inline, scenario_id)
        mode = "inline"

    return {"scenario_id": scenario_id, "status": "calculating", "mode": mode}


@router.get("/{scenario_id}/events")
async def api_events(scenario_id: int, user: CurrentUser) -> StreamingResponse:
    async def event_stream():
        last_status = None
        for _ in range(120):  # ~60s max with 0.5s sleeps
            async with SessionLocal() as session:
                sc = await get_scenario(session, scenario_id)
                if sc is None:
                    yield b'event: error\ndata: scenario_not_found\n\n'
                    return
                if sc.owner_id != user.id and user.role != "admin":
                    yield b'event: error\ndata: forbidden\n\n'
                    return
                if sc.status != last_status:
                    payload = json.dumps({"status": sc.status}).encode()
                    yield b"event: status\ndata: " + payload + b"\n\n"
                    last_status = sc.status
                if sc.status in ("ready", "failed"):
                    return
            await asyncio.sleep(0.5)
        yield b'event: timeout\ndata: {}\n\n'

    return StreamingResponse(event_stream(), media_type="text/event-stream")
