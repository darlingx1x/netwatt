from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from netwatt.catalog.models import Equipment
from netwatt.scenarios.models import Scenario, ScenarioItem
from netwatt.scenarios.schemas import ScenarioCreate, ScenarioUpdate
from netwatt.users.models import User


class ScenarioError(Exception):
    pass


async def create_scenario(
    session: AsyncSession, owner: User, data: ScenarioCreate
) -> Scenario:
    sc = Scenario(
        owner_id=owner.id,
        name=data.name,
        notes=data.notes,
        tariff=data.tariff.model_dump(),
        traffic=data.traffic.model_dump(),
        policies=data.policies.model_dump(),
        ef_grid=data.ef_grid,
    )
    session.add(sc)
    await session.flush()

    for it in data.items:
        eq = await session.get(Equipment, it.equipment_id)
        if eq is None:
            raise ScenarioError(f"equipment_not_found:{it.equipment_id}")
        session.add(
            ScenarioItem(
                scenario_id=sc.id,
                equipment_id=it.equipment_id,
                quantity=it.quantity,
                location=it.location,
            )
        )
    await session.flush()
    return sc


async def get_scenario(
    session: AsyncSession, scenario_id: int
) -> Scenario | None:
    stmt = (
        select(Scenario)
        .where(Scenario.id == scenario_id)
        .options(selectinload(Scenario.items), selectinload(Scenario.result))
    )
    return await session.scalar(stmt)


async def list_scenarios(
    session: AsyncSession, owner: User, include_others: bool = False
) -> list[Scenario]:
    stmt = select(Scenario).options(
        selectinload(Scenario.items), selectinload(Scenario.result)
    )
    if not include_others:
        stmt = stmt.where(Scenario.owner_id == owner.id)
    stmt = stmt.order_by(Scenario.updated_at.desc())
    return list((await session.scalars(stmt)).all())


async def update_scenario(
    session: AsyncSession, scenario: Scenario, data: ScenarioUpdate
) -> Scenario:
    if data.name is not None:
        scenario.name = data.name
    if data.notes is not None:
        scenario.notes = data.notes
    if data.tariff is not None:
        scenario.tariff = data.tariff.model_dump()
    if data.traffic is not None:
        scenario.traffic = data.traffic.model_dump()
    if data.policies is not None:
        scenario.policies = data.policies.model_dump()
    if data.ef_grid is not None:
        from decimal import Decimal

        scenario.ef_grid = Decimal(str(data.ef_grid))
    # status rolls back to draft on edit — recalculation needed
    scenario.status = "draft"
    await session.flush()
    return scenario


async def delete_scenario(session: AsyncSession, scenario: Scenario) -> None:
    await session.delete(scenario)
    await session.flush()


async def add_item(
    session: AsyncSession, scenario: Scenario, equipment_id: int, quantity: int, location: str | None
) -> ScenarioItem:
    eq = await session.get(Equipment, equipment_id)
    if eq is None:
        raise ScenarioError(f"equipment_not_found:{equipment_id}")
    item = ScenarioItem(
        scenario_id=scenario.id,
        equipment_id=equipment_id,
        quantity=quantity,
        location=location,
    )
    session.add(item)
    scenario.status = "draft"
    await session.flush()
    return item


async def remove_item(session: AsyncSession, scenario: Scenario, item_id: int) -> bool:
    item = await session.get(ScenarioItem, item_id)
    if item is None or item.scenario_id != scenario.id:
        return False
    await session.delete(item)
    scenario.status = "draft"
    await session.flush()
    return True
