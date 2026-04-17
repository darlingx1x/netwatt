import subprocess

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio()
async def test_all_seven_tables_exist(session: AsyncSession) -> None:
    rows = await session.execute(
        text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_type='BASE TABLE' "
            "ORDER BY table_name"
        )
    )
    tables = {r[0] for r in rows}
    expected = {
        "alembic_version",
        "audit_log",
        "auth_tokens",
        "equipment",
        "scenario_items",
        "scenario_results",
        "scenarios",
        "users",
    }
    assert expected.issubset(tables), f"Missing tables: {expected - tables}"


@pytest.mark.asyncio()
async def test_citext_extension_present(session: AsyncSession) -> None:
    r = await session.execute(text("SELECT extname FROM pg_extension WHERE extname='citext'"))
    assert r.scalar() == "citext"


def test_alembic_upgrade_is_idempotent() -> None:
    res = subprocess.run(
        ["alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"stderr: {res.stderr}"
