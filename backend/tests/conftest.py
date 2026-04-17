from __future__ import annotations

from collections.abc import AsyncIterator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from netwatt.db import get_session
from netwatt.main import app
from netwatt.settings import settings


@pytest_asyncio.fixture()
async def engine() -> AsyncIterator[AsyncEngine]:
    eng = create_async_engine(settings.database_url, echo=False, poolclass=NullPool)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture()
async def session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with sessionmaker() as s:
        yield s


@pytest_asyncio.fixture()
async def client(engine: AsyncEngine) -> AsyncIterator[AsyncClient]:
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def _get_session() -> AsyncIterator[AsyncSession]:
        async with sessionmaker() as s:
            try:
                yield s
                await s.commit()
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_session] = _get_session
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_session, None)
