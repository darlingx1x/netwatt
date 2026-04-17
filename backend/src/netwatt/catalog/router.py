from fastapi import APIRouter, Query

from netwatt.catalog.schemas import (
    EquipmentCreate,
    EquipmentList,
    EquipmentRead,
    EquipmentUpdate,
)
from netwatt.catalog.service import (
    create_equipment,
    delete_equipment,
    get_equipment,
    list_equipment,
    update_equipment,
)
from netwatt.deps import AdminUser, CurrentUser, SessionDep
from netwatt.errors import not_found

router = APIRouter(prefix="/api/equipment", tags=["catalog"])


@router.get("", response_model=EquipmentList)
async def api_list(
    session: SessionDep,
    _: CurrentUser,
    vendor: str | None = None,
    category: str | None = None,
    q: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> EquipmentList:
    rows, total = await list_equipment(session, vendor, category, q, offset, limit)
    return EquipmentList(
        items=[EquipmentRead.model_validate(r) for r in rows],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/{equipment_id}", response_model=EquipmentRead)
async def api_get(equipment_id: int, session: SessionDep, _: CurrentUser) -> EquipmentRead:
    eq = await get_equipment(session, equipment_id)
    if eq is None:
        raise not_found("equipment_not_found")
    return EquipmentRead.model_validate(eq)


@router.post("", response_model=EquipmentRead, status_code=201)
async def api_create(
    data: EquipmentCreate, session: SessionDep, _: AdminUser
) -> EquipmentRead:
    eq = await create_equipment(session, data)
    return EquipmentRead.model_validate(eq)


@router.patch("/{equipment_id}", response_model=EquipmentRead)
async def api_update(
    equipment_id: int, data: EquipmentUpdate, session: SessionDep, _: AdminUser
) -> EquipmentRead:
    eq = await update_equipment(session, equipment_id, data)
    if eq is None:
        raise not_found("equipment_not_found")
    return EquipmentRead.model_validate(eq)


@router.delete("/{equipment_id}", status_code=204)
async def api_delete(equipment_id: int, session: SessionDep, _: AdminUser) -> None:
    ok = await delete_equipment(session, equipment_id)
    if not ok:
        raise not_found("equipment_not_found")
