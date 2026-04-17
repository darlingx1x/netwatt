from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from netwatt.scenarios.models import AuditLog


async def record(
    session: AsyncSession,
    *,
    user_id: int | None,
    action: str,
    entity: str,
    entity_id: int | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    session.add(
        AuditLog(
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            meta=meta,
        )
    )
    await session.flush()
