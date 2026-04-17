"""Энергетическое ядро NetWatt.

Именование совпадает с ВКР Шарипова Ж. (формулы 2.1–2.12).
Все функции чистые — не обращаются к БД/сети.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import isfinite

HOURS_PER_YEAR = 8760.0


@dataclass(frozen=True, slots=True)
class DeviceSpec:
    p_idle_w: float
    p_max_w: float
    ports_total: int
    poe_ports: int
    poe_budget_w: float
    eee: bool
    alr: bool
    poe_sched: bool


@dataclass(frozen=True, slots=True)
class TrafficProfile:
    day_util: float
    peak_util: float
    night_util: float
    day_hours: float
    peak_hours: float
    night_hours: float

    @property
    def total_hours(self) -> float:
        return self.day_hours + self.peak_hours + self.night_hours

    def weighted(self) -> float:
        total = self.total_hours
        if total == 0:
            return 0.0
        return (
            self.day_util * self.day_hours
            + self.peak_util * self.peak_hours
            + self.night_util * self.night_hours
        ) / total


@dataclass(frozen=True, slots=True)
class Tariff:
    day_uzs: float
    peak_uzs: float
    night_uzs: float


@dataclass(frozen=True, slots=True)
class Policies:
    eee_enabled: bool = False
    eee_eta: float = 0.5
    alr_enabled: bool = False
    alr_drop: float = 0.4
    poe_sched_enabled: bool = False
    poe_off_hours: float = 12.0
    consolidation_enabled: bool = False
    consolidation_min_servers: int = 1
    consolidation_night_hours: float = 8.0


def p_device_w(d: DeviceSpec, util: float) -> float:
    """Мгновенная мощность устройства при нагрузке util ∈ [0,1]."""
    return d.p_idle_w + (d.p_max_w - d.p_idle_w) * util


def e_device_year_kwh(d: DeviceSpec, util_avg: float) -> float:
    """Годовое потребление устройства (кВт·ч) при усреднённой загрузке."""
    v = HOURS_PER_YEAR * p_device_w(d, util_avg) / 1000.0
    assert isfinite(v)
    return v


def e_device_by_profile_kwh(d: DeviceSpec, tp: TrafficProfile, days_per_year: float = 365.0) -> tuple[float, float, float]:
    """Возвращает (E_day, E_peak, E_night) — кВт·ч за год по периодам суток."""
    e_day = days_per_year * tp.day_hours * p_device_w(d, tp.day_util) / 1000.0
    e_peak = days_per_year * tp.peak_hours * p_device_w(d, tp.peak_util) / 1000.0
    e_night = days_per_year * tp.night_hours * p_device_w(d, tp.night_util) / 1000.0
    return e_day, e_peak, e_night


def delta_eee_kwh(d: DeviceSpec, tp: TrafficProfile, eta: float = 0.5) -> float:
    """Экономия от IEEE 802.3az EEE (idle-порты снижают энергию на eta)."""
    if not d.eee or d.ports_total == 0:
        return 0.0
    idle_fraction = 1.0 - tp.weighted()
    per_port_w = (d.p_max_w - d.p_idle_w) / d.ports_total
    return d.ports_total * per_port_w * idle_fraction * eta * HOURS_PER_YEAR / 1000.0


def delta_alr_kwh(d: DeviceSpec, tp: TrafficProfile, drop: float = 0.4) -> float:
    """Экономия от Adaptive Link Rate (снижение скорости в часы низкой нагрузки)."""
    if not d.alr:
        return 0.0
    low_hours_per_day = tp.night_hours + max(0.0, tp.day_hours - tp.peak_hours)
    low_hours_year = low_hours_per_day * 365.0
    savings_w = (d.p_max_w - d.p_idle_w) * drop
    return savings_w * low_hours_year / 1000.0


def delta_poe_sched_kwh(d: DeviceSpec, off_hours_per_day: float) -> float:
    """Экономия от PoE scheduling (отключение PoE в указанные часы)."""
    if not d.poe_sched or d.poe_budget_w <= 0:
        return 0.0
    off_hours_year = off_hours_per_day * 365.0
    return d.poe_budget_w * off_hours_year / 1000.0


def delta_consolidation_kwh(
    server_p_idle_w: float, total_servers: int, min_needed: int, night_hours_per_day: float
) -> float:
    """Экономия от консолидации серверов — выключение избыточных в непиковые часы."""
    extra = max(0, total_servers - min_needed)
    night_hours_year = night_hours_per_day * 365.0
    return extra * server_p_idle_w * night_hours_year / 1000.0


def cost_annual_uzs(
    e_kwh_day: float, e_kwh_peak: float, e_kwh_night: float, tariff: Tariff
) -> float:
    return (
        e_kwh_day * tariff.day_uzs
        + e_kwh_peak * tariff.peak_uzs
        + e_kwh_night * tariff.night_uzs
    )


def payback_years(investment_uzs: float, annual_savings_uzs: float) -> float | None:
    if annual_savings_uzs <= 0:
        return None
    return investment_uzs / annual_savings_uzs


def npv_uzs(cash_flows: list[float], discount_rate: float, investment: float) -> float:
    return (
        sum(cf / (1 + discount_rate) ** (i + 1) for i, cf in enumerate(cash_flows))
        - investment
    )


def co2_saved_kg(delta_kwh: float, ef_grid: float) -> float:
    return delta_kwh * ef_grid
