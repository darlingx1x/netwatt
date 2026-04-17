from datetime import datetime
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc, select

from netwatt.deps import AdminUser, SessionDep
from netwatt.scenarios.models import AuditLog

router = APIRouter(prefix="/api/audit", tags=["audit"])


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    action: str
    entity: str
    entity_id: int | None
    meta: dict[str, Any] | None
    created_at: datetime


@router.get("", response_model=list[AuditLogRead])
async def list_audit(
    session: SessionDep,
    _: AdminUser,
    limit: int = Query(200, ge=1, le=1000),
    entity: str | None = None,
) -> list[AuditLogRead]:
    stmt = select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)
    if entity:
        stmt = stmt.where(AuditLog.entity == entity)
    rows = (await session.scalars(stmt)).all()
    return [AuditLogRead.model_validate(r) for r in rows]
