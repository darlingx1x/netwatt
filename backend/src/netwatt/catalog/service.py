from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from netwatt.catalog.models import Equipment
from netwatt.catalog.schemas import EquipmentCreate, EquipmentUpdate


async def list_equipment(
    session: AsyncSession,
    vendor: str | None = None,
    category: str | None = None,
    q: str | None = None,
    offset: int = 0,
    limit: int = 100,
) -> tuple[list[Equipment], int]:
    stmt = select(Equipment)
    count_stmt = select(func.count(Equipment.id))
    if vendor:
        stmt = stmt.where(Equipment.vendor == vendor)
        count_stmt = count_stmt.where(Equipment.vendor == vendor)
    if category:
        stmt = stmt.where(Equipment.category == category)
        count_stmt = count_stmt.where(Equipment.category == category)
    if q:
        like = f"%{q}%"
        cond = or_(Equipment.vendor.ilike(like), Equipment.model.ilike(like))
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    stmt = stmt.order_by(Equipment.vendor, Equipment.model).offset(offset).limit(limit)
    total = (await session.scalar(count_stmt)) or 0
    rows = list((await session.scalars(stmt)).all())
    return rows, total


async def get_equipment(session: AsyncSession, equipment_id: int) -> Equipment | None:
    return await session.get(Equipment, equipment_id)


async def create_equipment(session: AsyncSession, data: EquipmentCreate) -> Equipment:
    eq = Equipment(**data.model_dump())
    session.add(eq)
    await session.flush()
    return eq


async def update_equipment(
    session: AsyncSession, equipment_id: int, data: EquipmentUpdate
) -> Equipment | None:
    eq = await session.get(Equipment, equipment_id)
    if eq is None:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(eq, field, value)
    await session.flush()
    return eq


async def delete_equipment(session: AsyncSession, equipment_id: int) -> bool:
    eq = await session.get(Equipment, equipment_id)
    if eq is None:
        return False
    await session.delete(eq)
    await session.flush()
    return True
