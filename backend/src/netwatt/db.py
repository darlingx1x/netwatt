from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from netwatt.settings import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def _register_models() -> None:
    """Import all model modules so SQLAlchemy resolves string-referenced relationships."""
    from netwatt.auth import models as _auth  # noqa: F401
    from netwatt.catalog import models as _catalog  # noqa: F401
    from netwatt.scenarios import models as _scenarios  # noqa: F401
    from netwatt.users import models as _users  # noqa: F401


_register_models()
