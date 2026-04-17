"""Высокоуровневый движок расчёта сценария. Агрегирует formulas.py по позициям."""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from netwatt.calc.formulas import (
    DeviceSpec,
    Policies,
    Tariff,
    TrafficProfile,
    co2_saved_kg,
    cost_annual_uzs,
    delta_alr_kwh,
    delta_consolidation_kwh,
    delta_eee_kwh,
    delta_poe_sched_kwh,
    e_device_by_profile_kwh,
    e_device_year_kwh,
    payback_years,
    npv_uzs,
)


@dataclass(frozen=True, slots=True)
class CatalogEntry:
    id: int
    vendor: str
    model: str
    category: str
    spec: DeviceSpec


@dataclass(frozen=True, slots=True)
class ScenarioInput:
    items: list[tuple[CatalogEntry, int]]  # (equipment, quantity)
    traffic: TrafficProfile
    tariff: Tariff
    policies: Policies
    ef_grid: float = 0.468
    investment_uzs: float = 0.0
    discount_rate: float = 0.12
    horizon_years: int = 5


@dataclass(slots=True)
class PerDeviceResult:
    equipment_id: int
    vendor: str
    model: str
    quantity: int
    e_base_kwh: float
    e_optimized_kwh: float
    delta_total_kwh: float
    delta_by_policy: dict[str, float] = field(default_factory=dict)


@dataclass(slots=True)
class ScenarioResult:
    e_base_kwh: float
    e_optimized_kwh: float
    savings_kwh: float
    savings_money_uzs: float
    co2_saved_kg: float
    payback_years: float | None
    npv_uzs: float
    breakdown: dict[str, float]  # {eee, alr, poe, consolidation}
    per_device: list[PerDeviceResult]

    def to_db(self) -> dict[str, Any]:
        return {
            "e_base_kwh": Decimal(f"{self.e_base_kwh:.2f}"),
            "e_optimized_kwh": Decimal(f"{self.e_optimized_kwh:.2f}"),
            "savings_kwh": Decimal(f"{self.savings_kwh:.2f}"),
            "savings_money": Decimal(f"{self.savings_money_uzs:.2f}"),
            "co2_saved_kg": Decimal(f"{self.co2_saved_kg:.2f}"),
            "payback_years": (
                Decimal(f"{self.payback_years:.2f}") if self.payback_years is not None else None
            ),
            "npv": Decimal(f"{self.npv_uzs:.2f}"),
            "breakdown": self.breakdown,
            "per_device": [
                {
                    "equipment_id": p.equipment_id,
                    "vendor": p.vendor,
                    "model": p.model,
                    "quantity": p.quantity,
                    "e_base_kwh": round(p.e_base_kwh, 2),
                    "e_optimized_kwh": round(p.e_optimized_kwh, 2),
                    "delta_total_kwh": round(p.delta_total_kwh, 2),
                    "delta_by_policy": {k: round(v, 2) for k, v in p.delta_by_policy.items()},
                }
                for p in self.per_device
            ],
        }


def run_scenario(inp: ScenarioInput) -> ScenarioResult:
    breakdown = {"eee": 0.0, "alr": 0.0, "poe": 0.0, "consolidation": 0.0}
    per_device: list[PerDeviceResult] = []
    e_base_total = 0.0
    e_opt_total = 0.0

    e_day_total = 0.0
    e_peak_total = 0.0
    e_night_total = 0.0

    total_servers = sum(q for eq, q in inp.items if eq.category == "server")

    for eq, qty in inp.items:
        d = eq.spec
        e_base = qty * e_device_year_kwh(d, inp.traffic.weighted())
        e_day, e_peak, e_night = e_device_by_profile_kwh(d, inp.traffic)

        d_eee = qty * delta_eee_kwh(d, inp.traffic, inp.policies.eee_eta) if inp.policies.eee_enabled else 0.0
        d_alr = qty * delta_alr_kwh(d, inp.traffic, inp.policies.alr_drop) if inp.policies.alr_enabled else 0.0
        d_poe = (
            qty * delta_poe_sched_kwh(d, inp.policies.poe_off_hours)
            if inp.policies.poe_sched_enabled
            else 0.0
        )
        d_cons = 0.0
        if (
            inp.policies.consolidation_enabled
            and eq.category == "server"
            and total_servers > inp.policies.consolidation_min_servers
        ):
            share = qty / total_servers
            d_cons = share * delta_consolidation_kwh(
                d.p_idle_w,
                total_servers,
                inp.policies.consolidation_min_servers,
                inp.policies.consolidation_night_hours,
            )

        delta_total = d_eee + d_alr + d_poe + d_cons
        e_opt = max(0.0, e_base - delta_total)

        breakdown["eee"] += d_eee
        breakdown["alr"] += d_alr
        breakdown["poe"] += d_poe
        breakdown["consolidation"] += d_cons

        e_base_total += e_base
        e_opt_total += e_opt
        e_day_total += qty * e_day
        e_peak_total += qty * e_peak
        e_night_total += qty * e_night

        per_device.append(
            PerDeviceResult(
                equipment_id=eq.id,
                vendor=eq.vendor,
                model=eq.model,
                quantity=qty,
                e_base_kwh=e_base,
                e_optimized_kwh=e_opt,
                delta_total_kwh=delta_total,
                delta_by_policy={
                    "eee": d_eee,
                    "alr": d_alr,
                    "poe": d_poe,
                    "consolidation": d_cons,
                },
            )
        )

    savings_kwh = e_base_total - e_opt_total

    cost_base = cost_annual_uzs(e_day_total, e_peak_total, e_night_total, inp.tariff)
    if e_base_total > 0:
        ratio = e_opt_total / e_base_total
    else:
        ratio = 0.0
    cost_opt = cost_base * ratio
    savings_money = cost_base - cost_opt

    pb = payback_years(inp.investment_uzs, savings_money)
    npv = npv_uzs([savings_money] * inp.horizon_years, inp.discount_rate, inp.investment_uzs)
    co2 = co2_saved_kg(savings_kwh, inp.ef_grid)

    return ScenarioResult(
        e_base_kwh=e_base_total,
        e_optimized_kwh=e_opt_total,
        savings_kwh=savings_kwh,
        savings_money_uzs=savings_money,
        co2_saved_kg=co2,
        payback_years=pb,
        npv_uzs=npv,
        breakdown=breakdown,
        per_device=per_device,
    )
