from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from netwatt.deps import AdminUser, SessionDep
from netwatt.errors import bad_request, not_found
from netwatt.users.models import User

router = APIRouter(prefix="/api/users", tags=["users"])


class UserListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    lang: str
    is_active: bool


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    lang: str | None = None
    is_active: bool | None = None


@router.get("", response_model=list[UserListItem])
async def list_users(session: SessionDep, _: AdminUser) -> list[UserListItem]:
    rows = (await session.scalars(select(User).order_by(User.id))).all()
    return [UserListItem.model_validate(r) for r in rows]


@router.patch("/{user_id}", response_model=UserListItem)
async def update_user(
    user_id: int, data: UserUpdate, session: SessionDep, admin: AdminUser
) -> UserListItem:
    user = await session.get(User, user_id)
    if user is None:
        raise not_found("user_not_found")
    if user.id == admin.id and data.is_active is False:
        raise bad_request("cannot_deactivate_self")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(user, field, value)
    await session.flush()
    return UserListItem.model_validate(user)
