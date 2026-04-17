import json

from fastapi import APIRouter, File, Query, UploadFile
from pydantic import ValidationError
from sqlalchemy import select

from netwatt.catalog.models import Equipment
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
from netwatt.errors import bad_request, not_found

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


@router.post("/import", tags=["catalog"])
async def api_import(
    session: SessionDep, _: AdminUser, file: UploadFile = File(...)
) -> dict:
    try:
        raw = await file.read()
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        raise bad_request(f"invalid_json: {e}") from e
    if not isinstance(data, list):
        raise bad_request("expected_json_array")

    created = 0
    updated = 0
    errors: list[dict] = []

    for i, entry in enumerate(data):
        try:
            payload = EquipmentCreate(**entry)
        except ValidationError as e:
            errors.append({"index": i, "error": e.errors()})
            continue
        existing = await session.scalar(
            select(Equipment).where(
                Equipment.vendor == payload.vendor, Equipment.model == payload.model
            )
        )
        if existing is None:
            session.add(Equipment(**payload.model_dump()))
            created += 1
        else:
            for k, v in payload.model_dump().items():
                setattr(existing, k, v)
            updated += 1
    await session.commit()
    return {"created": created, "updated": updated, "errors": errors, "total": len(data)}
