from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy import desc, select

from netwatt.auth.models import AuthToken
from netwatt.deps import AdminUser, CurrentUser, SessionDep

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    kind: str
    ip: str | None
    user_agent: str | None
    expires_at: datetime
    revoked_at: datetime | None
    created_at: datetime

    @field_validator("ip", mode="before")
    @classmethod
    def _ip_to_str(cls, v: Any) -> str | None:
        return None if v is None else str(v)


@router.get("/me", response_model=list[SessionRead])
async def my_sessions(session: SessionDep, user: CurrentUser) -> list[SessionRead]:
    rows = (
        await session.scalars(
            select(AuthToken)
            .where(AuthToken.user_id == user.id)
            .order_by(desc(AuthToken.created_at))
            .limit(50)
        )
    ).all()
    return [SessionRead.model_validate(r) for r in rows]


@router.get("", response_model=list[SessionRead])
async def all_sessions(session: SessionDep, _: AdminUser) -> list[SessionRead]:
    rows = (
        await session.scalars(
            select(AuthToken).order_by(desc(AuthToken.created_at)).limit(200)
        )
    ).all()
    return [SessionRead.model_validate(r) for r in rows]
