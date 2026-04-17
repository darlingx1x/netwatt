from __future__ import annotations

import asyncio
import json
from decimal import Decimal
from pathlib import Path

import typer
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

from netwatt.auth.schemas import RegisterReq
from netwatt.auth.service import register as register_user
from netwatt.catalog.models import Equipment
from netwatt.db import SessionLocal
from netwatt.scenarios.calc_runner import perform_calculation
from netwatt.scenarios.models import Scenario, ScenarioItem, ScenarioResult
from netwatt.settings import settings
from netwatt.users.models import User

app = typer.Typer(no_args_is_help=True)

SEEDS_DIR = Path(__file__).resolve().parent.parent.parent / "seeds"


@app.command()
def seed(
    reset: bool = typer.Option(False, help="Drop and reinsert equipment catalog"),
) -> None:
    """Minimal seed: equipment catalog + 2 demo users."""
    asyncio.run(_seed(reset=reset))


@app.command()
def seed_demo(
    reset: bool = typer.Option(True, help="Wipe all users/scenarios before seeding"),
) -> None:
    """Rich demo seed: 4 users, 6 scenarios with calculated results."""
    asyncio.run(_seed_demo(reset=reset))


@app.command()
def version() -> None:
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


async def _seed_demo(reset: bool) -> None:
    async with SessionLocal() as session:
        if reset:
            await session.execute(delete(ScenarioResult))
            await session.execute(delete(ScenarioItem))
            await session.execute(delete(Scenario))
            await session.execute(delete(User))
            await session.execute(delete(Equipment))

        # 1. Equipment catalog
        catalog_path = SEEDS_DIR / "equipment_catalog.json"
        data = json.loads(catalog_path.read_text())
        for entry in data:
            stmt = insert(Equipment).values(**entry)
            stmt = stmt.on_conflict_do_update(
                index_elements=["vendor", "model"],
                set_={k: v for k, v in entry.items() if k not in ("vendor", "model")},
            )
            await session.execute(stmt)

        # 2. Users
        admin = await _ensure_user(
            session,
            email="admin@tuit.uz",
            full_name="Шарипов Жавохир",
            password=settings.seed_admin_password or "admin1234",
            role="admin",
        )
        eng1 = await _ensure_user(
            session,
            email="engineer@tuit.uz",
            full_name="Demo Engineer",
            password=settings.seed_engineer_password or "engineer1234",
            role="engineer",
        )
        eng2 = await _ensure_user(
            session,
            email="alisher@tuit.uz",
            full_name="Алишер Каримов",
            password="alisher1234",
            role="engineer",
        )
        eng3 = await _ensure_user(
            session,
            email="madina@tuit.uz",
            full_name="Мадина Рахимова",
            password="madina1234",
            role="engineer",
        )
        await session.commit()

        # 3. Map equipment lookup
        all_eq = (await session.scalars(select(Equipment))).all()
        by_model: dict[str, Equipment] = {e.model: e for e in all_eq}

        def eq(model_substr: str) -> Equipment:
            for e in all_eq:
                if model_substr in e.model:
                    return e
            raise KeyError(model_substr)

        presets = {
            "office_8x5": {
                "day_util": 0.35, "peak_util": 0.70, "night_util": 0.05,
                "day_hours": 6, "peak_hours": 2, "night_hours": 16,
            },
            "datacenter_24x7": {
                "day_util": 0.50, "peak_util": 0.85, "night_util": 0.40,
                "day_hours": 10, "peak_hours": 4, "night_hours": 10,
            },
            "campus": {
                "day_util": 0.40, "peak_util": 0.75, "night_util": 0.10,
                "day_hours": 8, "peak_hours": 3, "night_hours": 13,
            },
            "industrial": {
                "day_util": 0.60, "peak_util": 0.85, "night_util": 0.30,
                "day_hours": 16, "peak_hours": 4, "night_hours": 4,
            },
        }

        tariff_business = {"day": 1050, "peak": 1450, "night": 450, "currency": "UZS"}
        tariff_budget = {"day": 600, "peak": 900, "night": 300, "currency": "UZS"}

        all_on = {
            "eee": {"enabled": True, "eta": 0.5},
            "alr": {"enabled": True, "drop": 0.4},
            "poe_sched": {"enabled": True, "off_hours": 12},
            "consolidation": {"enabled": True, "min_servers": 1, "night_hours": 8},
        }
        only_eee_alr = {
            "eee": {"enabled": True, "eta": 0.5},
            "alr": {"enabled": True, "drop": 0.4},
            "poe_sched": {"enabled": False, "off_hours": 12},
            "consolidation": {"enabled": False, "min_servers": 1, "night_hours": 8},
        }
        only_poe = {
            "eee": {"enabled": False, "eta": 0.5},
            "alr": {"enabled": False, "drop": 0.4},
            "poe_sched": {"enabled": True, "off_hours": 14},
            "consolidation": {"enabled": False, "min_servers": 1, "night_hours": 8},
        }

        demo_scenarios = [
            {
                "owner": eng1,
                "name": "Корпоративная сеть 120 портов",
                "notes": "ВКР ТУИТ 2026 · эталонный кейс офиса со смешанным оборудованием",
                "traffic": presets["office_8x5"],
                "tariff": tariff_business,
                "policies": all_on,
                "items": [
                    (eq("9200L-24P-4G"), 6),
                    (eq("R650"), 2),
                    (eq("AP-515"), 10),
                    (eq("CRS326"), 3),
                ],
                "calculate": True,
            },
            {
                "owner": eng1,
                "name": "Датацентр ISP POP 450 устройств",
                "notes": "24×7 загрузка, только серверы и ядро",
                "traffic": presets["datacenter_24x7"],
                "tariff": tariff_business,
                "policies": all_on,
                "items": [
                    (eq("9300-48P"), 12),
                    (eq("9500-32C"), 4),
                    (eq("R650"), 20),
                    (eq("DL380 Gen10"), 15),
                    (eq("Smart-UPS SRT 3000"), 6),
                ],
                "calculate": True,
            },
            {
                "owner": eng2,
                "name": "Университетский кампус — 3 корпуса",
                "notes": "Смешанная нагрузка кампуса, бюджетный тариф",
                "traffic": presets["campus"],
                "tariff": tariff_budget,
                "policies": only_eee_alr,
                "items": [
                    (eq("Catalyst 1300-24P-4X"), 20),
                    (eq("EAP670"), 40),
                    (eq("U6-LR"), 20),
                    (eq("CCR2004"), 2),
                ],
                "calculate": True,
            },
            {
                "owner": eng3,
                "name": "Производство — цех, PoE-камеры",
                "notes": "Высокая дневная нагрузка, включён только PoE scheduling на ночь",
                "traffic": presets["industrial"],
                "tariff": tariff_business,
                "policies": only_poe,
                "items": [
                    (eq("Omada TL-SG3428XMP"), 8),
                    (eq("USW-48-PoE"), 4),
                    (eq("AR6280"), 2),
                ],
                "calculate": True,
            },
            {
                "owner": eng1,
                "name": "Ретейл-сеть 15 филиалов — экономный вариант",
                "notes": "Сравнительный сценарий: только EEE+ALR, без PoE",
                "traffic": presets["office_8x5"],
                "tariff": tariff_budget,
                "policies": only_eee_alr,
                "items": [
                    (eq("CSS610-8G"), 15),
                    (eq("cAP ac"), 30),
                    (eq("CCR1036"), 3),
                ],
                "calculate": True,
            },
            {
                "owner": eng2,
                "name": "Черновик: новый филиал",
                "notes": "Пока без расчёта — планируется на следующую неделю",
                "traffic": presets["office_8x5"],
                "tariff": tariff_business,
                "policies": all_on,
                "items": [
                    (eq("Aruba CX 6100 24G"), 2),
                    (eq("AP-515"), 4),
                ],
                "calculate": False,
            },
        ]

        created_ids: list[int] = []
        for payload in demo_scenarios:
            sc = Scenario(
                owner_id=payload["owner"].id,
                name=payload["name"],
                notes=payload["notes"],
                tariff=payload["tariff"],
                traffic=payload["traffic"],
                policies=payload["policies"],
                ef_grid=Decimal("0.468"),
                status="draft",
            )
            session.add(sc)
            await session.flush()
            for eq_obj, qty in payload["items"]:
                session.add(
                    ScenarioItem(
                        scenario_id=sc.id,
                        equipment_id=eq_obj.id,
                        quantity=qty,
                    )
                )
            await session.commit()
            if payload["calculate"]:
                await perform_calculation(session, sc.id)
                created_ids.append(sc.id)
            typer.echo(f"  scenario #{sc.id:<3} ({payload['owner'].email:20}) {payload['name']}")

        typer.echo(f"\n✓ Seeded: 50 equipment · 4 users · {len(demo_scenarios)} scenarios ({len(created_ids)} calculated)")
        typer.echo("\nDemo logins:")
        typer.echo("  admin@tuit.uz      / admin1234")
        typer.echo("  engineer@tuit.uz   / engineer1234")
        typer.echo("  alisher@tuit.uz    / alisher1234")
        typer.echo("  madina@tuit.uz     / madina1234")


async def _ensure_user(
    session, email: str, full_name: str, password: str, role: str
) -> User:  # type: ignore[no-untyped-def]
    existing = await session.scalar(select(User).where(User.email == email))
    if existing is not None:
        return existing
    user = await register_user(
        session,
        RegisterReq(email=email, full_name=full_name, password=password, role=role),
    )
    return user


if __name__ == "__main__":
    app()
