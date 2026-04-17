"""Синхронный раннер расчёта — используется воркером и inline-fallback."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from netwatt.calc.engine import CatalogEntry, Policies, ScenarioInput, run_scenario
from netwatt.calc.formulas import DeviceSpec, Tariff, TrafficProfile
from netwatt.catalog.models import Equipment
from netwatt.scenarios.models import Scenario, ScenarioResult


async def perform_calculation(session: AsyncSession, scenario_id: int) -> str:
    """Загружает сценарий из БД, выполняет расчёт, сохраняет результат.

    Возвращает статус: 'ready' или 'failed'.
    """
    stmt = (
        select(Scenario)
        .where(Scenario.id == scenario_id)
        .options(selectinload(Scenario.items), selectinload(Scenario.result))
    )
    scenario = await session.scalar(stmt)
    if scenario is None:
        return "failed"
    try:
        items_with_eq = []
        for item in scenario.items:
            eq = await session.get(Equipment, item.equipment_id)
            if eq is None:
                continue
            entry = CatalogEntry(
                id=eq.id,
                vendor=eq.vendor,
                model=eq.model,
                category=eq.category,
                spec=DeviceSpec(
                    p_idle_w=float(eq.p_idle_w),
                    p_max_w=float(eq.p_max_w),
                    ports_total=eq.ports_total,
                    poe_ports=eq.poe_ports,
                    poe_budget_w=float(eq.poe_budget_w),
                    eee=eq.eee_supported,
                    alr=eq.alr_supported,
                    poe_sched=eq.poe_scheduling,
                ),
            )
            items_with_eq.append((entry, item.quantity))

        traffic = TrafficProfile(
            day_util=float(scenario.traffic["day_util"]),
            peak_util=float(scenario.traffic["peak_util"]),
            night_util=float(scenario.traffic["night_util"]),
            day_hours=float(scenario.traffic["day_hours"]),
            peak_hours=float(scenario.traffic["peak_hours"]),
            night_hours=float(scenario.traffic["night_hours"]),
        )
        tariff = Tariff(
            day_uzs=float(scenario.tariff["day"]),
            peak_uzs=float(scenario.tariff["peak"]),
            night_uzs=float(scenario.tariff["night"]),
        )
        pol_raw = scenario.policies or {}
        pol = Policies(
            eee_enabled=bool(pol_raw.get("eee", {}).get("enabled")),
            eee_eta=float(pol_raw.get("eee", {}).get("eta", 0.5)),
            alr_enabled=bool(pol_raw.get("alr", {}).get("enabled")),
            alr_drop=float(pol_raw.get("alr", {}).get("drop", 0.4)),
            poe_sched_enabled=bool(pol_raw.get("poe_sched", {}).get("enabled")),
            poe_off_hours=float(pol_raw.get("poe_sched", {}).get("off_hours", 12.0)),
            consolidation_enabled=bool(pol_raw.get("consolidation", {}).get("enabled")),
            consolidation_min_servers=int(pol_raw.get("consolidation", {}).get("min_servers", 1)),
            consolidation_night_hours=float(pol_raw.get("consolidation", {}).get("night_hours", 8.0)),
        )

        inp = ScenarioInput(
            items=items_with_eq,
            traffic=traffic,
            tariff=tariff,
            policies=pol,
            ef_grid=float(scenario.ef_grid),
            investment_uzs=float(pol_raw.get("investment_uzs", 0)),
        )
        result = run_scenario(inp)
        data = result.to_db()

        if scenario.result is None:
            session.add(ScenarioResult(scenario_id=scenario.id, **data))
        else:
            for k, v in data.items():
                setattr(scenario.result, k, v)
            scenario.result.calculated_at = datetime.now(timezone.utc)

        scenario.status = "ready"
        await session.commit()
    except Exception as e:
        scenario.status = "failed"
        if scenario.result is not None:
            breakdown = scenario.result.breakdown or {}
            breakdown["_error"] = str(e)
            scenario.result.breakdown = breakdown
        await session.commit()
        return "failed"

    return "ready"
