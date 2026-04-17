from __future__ import annotations

import asyncio
import json
from pathlib import Path

import typer
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

from netwatt.auth.schemas import RegisterReq
from netwatt.auth.service import register as register_user
from netwatt.catalog.models import Equipment
from netwatt.db import SessionLocal
from netwatt.settings import settings
from netwatt.users.models import User

app = typer.Typer(no_args_is_help=True)

SEEDS_DIR = Path(__file__).resolve().parent.parent.parent / "seeds"


@app.command()
def seed(
    reset: bool = typer.Option(False, help="Drop and reinsert equipment catalog"),
) -> None:
    """Seed equipment catalog and demo users."""
    asyncio.run(_seed(reset=reset))


@app.command()
def version() -> None:
    """Print CLI version."""
    typer.echo("netwatt cli 0.1.0")


async def _seed(reset: bool) -> None:
    async with SessionLocal() as session:
        catalog_path = SEEDS_DIR / "equipment_catalog.json"
        data = json.loads(catalog_path.read_text())
        if reset:
            await session.execute(delete(Equipment))

        for entry in data:
            stmt = insert(Equipment).values(**entry)
            stmt = stmt.on_conflict_do_update(
                index_elements=["vendor", "model"],
                set_={k: v for k, v in entry.items() if k not in ("vendor", "model")},
            )
            await session.execute(stmt)

        await _ensure_user(
            session,
            email="admin@tuit.uz",
            full_name="Шарипов Жавохир (admin)",
            password=settings.seed_admin_password or "admin1234",
            role="admin",
        )
        await _ensure_user(
            session,
            email="engineer@tuit.uz",
            full_name="Demo Engineer",
            password=settings.seed_engineer_password or "engineer1234",
            role="engineer",
        )
        await session.commit()
        typer.echo(f"Seeded {len(data)} equipment models + 2 demo users")


async def _ensure_user(session, email: str, full_name: str, password: str, role: str) -> None:  # type: ignore[no-untyped-def]
    existing = await session.scalar(select(User).where(User.email == email))
    if existing is not None:
        return
    await register_user(
        session,
        RegisterReq(email=email, full_name=full_name, password=password, role=role),
    )


if __name__ == "__main__":
    app()
