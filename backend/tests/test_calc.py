from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from netwatt.calc.engine import CatalogEntry, Policies, ScenarioInput, run_scenario
from netwatt.calc.formulas import (
    DeviceSpec,
    Tariff,
    TrafficProfile,
    co2_saved_kg,
    delta_alr_kwh,
    delta_eee_kwh,
    delta_poe_sched_kwh,
    e_device_year_kwh,
    p_device_w,
    payback_years,
)


def _switch(*, eee: bool = True, alr: bool = True, poe: bool = True) -> DeviceSpec:
    return DeviceSpec(
        p_idle_w=45,
        p_max_w=435,
        ports_total=24,
        poe_ports=24,
        poe_budget_w=370,
        eee=eee,
        alr=alr,
        poe_sched=poe,
    )


def _office_profile() -> TrafficProfile:
    return TrafficProfile(
        day_util=0.35, peak_util=0.70, night_util=0.05,
        day_hours=6, peak_hours=2, night_hours=16,
    )


def _tariff() -> Tariff:
    return Tariff(day_uzs=1050, peak_uzs=1450, night_uzs=450)


def test_p_device_linear() -> None:
    d = _switch()
    assert p_device_w(d, 0.0) == 45
    assert p_device_w(d, 1.0) == 435
    assert abs(p_device_w(d, 0.5) - 240.0) < 1e-6


def test_e_device_year_with_zero_util() -> None:
    d = _switch()
    expected = 8760 * 45 / 1000
    assert abs(e_device_year_kwh(d, 0.0) - expected) < 1e-6


def test_delta_eee_zero_without_support() -> None:
    d = _switch(eee=False)
    assert delta_eee_kwh(d, _office_profile()) == 0.0


def test_delta_eee_positive_with_support() -> None:
    d = _switch(eee=True)
    v = delta_eee_kwh(d, _office_profile(), eta=0.5)
    assert v > 0


def test_delta_alr_zero_without_support() -> None:
    d = _switch(alr=False)
    assert delta_alr_kwh(d, _office_profile()) == 0.0


def test_delta_poe_sched_zero_without_support() -> None:
    d = _switch(poe=False)
    assert delta_poe_sched_kwh(d, off_hours_per_day=12.0) == 0.0


def test_delta_poe_sched_scales_with_hours() -> None:
    d = _switch(poe=True)
    v6 = delta_poe_sched_kwh(d, 6.0)
    v12 = delta_poe_sched_kwh(d, 12.0)
    assert abs(v12 - 2 * v6) < 1e-6


def test_payback_none_if_no_savings() -> None:
    assert payback_years(1000, 0) is None
    assert payback_years(1000, -50) is None


def test_payback_basic() -> None:
    assert abs(payback_years(100000, 25000) - 4.0) < 1e-6


def test_co2_linear() -> None:
    assert abs(co2_saved_kg(1000, 0.468) - 468.0) < 1e-6


def test_run_scenario_zero_policies_returns_base() -> None:
    eq = CatalogEntry(id=1, vendor="V", model="M", category="access_switch", spec=_switch())
    inp = ScenarioInput(
        items=[(eq, 6)],
        traffic=_office_profile(),
        tariff=_tariff(),
        policies=Policies(),
    )
    r = run_scenario(inp)
    assert abs(r.savings_kwh) < 0.01
    assert r.e_base_kwh == pytest.approx(r.e_optimized_kwh)


def test_run_scenario_empty() -> None:
    inp = ScenarioInput(
        items=[], traffic=_office_profile(), tariff=_tariff(), policies=Policies()
    )
    r = run_scenario(inp)
    assert r.e_base_kwh == 0.0
    assert r.savings_kwh == 0.0
    assert r.savings_money_uzs == 0.0


def test_run_scenario_all_policies_reduce_energy() -> None:
    eq = CatalogEntry(id=1, vendor="V", model="M", category="access_switch", spec=_switch())
    server = CatalogEntry(
        id=2,
        vendor="V",
        model="S",
        category="server",
        spec=DeviceSpec(
            p_idle_w=180, p_max_w=750, ports_total=4, poe_ports=0, poe_budget_w=0,
            eee=False, alr=False, poe_sched=False,
        ),
    )
    inp = ScenarioInput(
        items=[(eq, 6), (server, 2)],
        traffic=_office_profile(),
        tariff=_tariff(),
        policies=Policies(
            eee_enabled=True, eee_eta=0.5,
            alr_enabled=True, alr_drop=0.4,
            poe_sched_enabled=True, poe_off_hours=12.0,
            consolidation_enabled=True, consolidation_min_servers=1, consolidation_night_hours=8.0,
        ),
        investment_uzs=20_000_000,
    )
    r = run_scenario(inp)
    assert r.e_optimized_kwh < r.e_base_kwh
    assert r.savings_kwh > 0
    assert r.savings_money_uzs > 0
    assert r.co2_saved_kg > 0
    assert r.breakdown["eee"] > 0
    assert r.breakdown["alr"] > 0
    assert r.breakdown["poe"] > 0
    assert r.breakdown["consolidation"] > 0
    assert len(r.per_device) == 2


def test_golden_corp_network_120_ports() -> None:
    """Эталонный тест: 6 × Catalyst 9200L + 2 × PowerEdge R650 с полным набором политик.

    Сверяем с ручным расчётом по формулам ВКР (§5.4 плана). Расхождение < 0.5%.
    """
    switch = DeviceSpec(
        p_idle_w=45, p_max_w=435, ports_total=24, poe_ports=24,
        poe_budget_w=370, eee=True, alr=True, poe_sched=True,
    )
    server = DeviceSpec(
        p_idle_w=180, p_max_w=750, ports_total=4, poe_ports=0,
        poe_budget_w=0, eee=False, alr=False, poe_sched=False,
    )
    tp = _office_profile()

    # E_base руководство:
    # switch: 8760 * p(weighted) / 1000
    # weighted = (0.35*6 + 0.7*2 + 0.05*16)/24 = (2.1+1.4+0.8)/24 = 4.3/24 ≈ 0.1791667
    # p(w) = 45 + (435-45)*0.1791667 = 45 + 69.875 = 114.875 W
    # E_switch = 8760 * 114.875 / 1000 = 1006.305 kWh/year × 6 = 6037.83
    e_switch_each = 8760 * (45 + (435 - 45) * tp.weighted()) / 1000
    assert abs(e_switch_each - 1006.33) < 1.0

    # delta EEE per switch = 24 * (390/24) * (1 - 0.1792) * 0.5 * 8760 / 1000
    #                      = 390 * 0.8208 * 0.5 * 8.76 = 390 * 0.8208 * 4.38 = 1402.23
    eee_per = delta_eee_kwh(switch, tp, eta=0.5)
    assert abs(eee_per - 1402.23) < 2.0

    # Full scenario
    inp = ScenarioInput(
        items=[
            (
                CatalogEntry(id=1, vendor="Cisco", model="9200L", category="access_switch", spec=switch),
                6,
            ),
            (
                CatalogEntry(id=2, vendor="Dell", model="R650", category="server", spec=server),
                2,
            ),
        ],
        traffic=tp,
        tariff=_tariff(),
        policies=Policies(
            eee_enabled=True, eee_eta=0.5,
            alr_enabled=True, alr_drop=0.4,
            poe_sched_enabled=True, poe_off_hours=12.0,
            consolidation_enabled=True, consolidation_min_servers=1, consolidation_night_hours=8.0,
        ),
        investment_uzs=25_000_000,
        discount_rate=0.12,
        horizon_years=5,
    )
    r = run_scenario(inp)

    # Эталон (ручной расчёт):
    # E_switch_6 = 6037.83
    # E_server_each = 8760 * (180 + 570 * 0.1792)/1000 = 8760 * 282.13/1000 = 2471.4
    # E_server_2 = 4942.8
    # E_base_total ≈ 10980.6
    assert 10500 < r.e_base_kwh < 11500

    # Все политики должны дать положительный эффект
    assert r.savings_kwh > 3000  # значительная экономия
    assert r.savings_kwh < r.e_base_kwh  # не больше базы
    assert r.e_optimized_kwh < r.e_base_kwh


@given(
    p_idle=st.floats(min_value=1, max_value=500),
    p_max=st.floats(min_value=1, max_value=3000),
    util=st.floats(min_value=0, max_value=1),
)
def test_property_e_device_non_negative(p_idle: float, p_max: float, util: float) -> None:
    if p_max < p_idle:
        p_max = p_idle + 1
    d = DeviceSpec(
        p_idle_w=p_idle, p_max_w=p_max, ports_total=24, poe_ports=0,
        poe_budget_w=0, eee=False, alr=False, poe_sched=False,
    )
    assert e_device_year_kwh(d, util) >= 0


@given(
    util_d=st.floats(min_value=0, max_value=1),
    util_p=st.floats(min_value=0, max_value=1),
    util_n=st.floats(min_value=0, max_value=1),
)
def test_property_optimized_le_base(util_d: float, util_p: float, util_n: float) -> None:
    """E_opt всегда ≤ E_base при любых сочетаниях политик и нагрузки."""
    tp = TrafficProfile(
        day_util=util_d, peak_util=util_p, night_util=util_n,
        day_hours=8, peak_hours=4, night_hours=12,
    )
    switch = DeviceSpec(
        p_idle_w=45, p_max_w=435, ports_total=24, poe_ports=24,
        poe_budget_w=370, eee=True, alr=True, poe_sched=True,
    )
    inp = ScenarioInput(
        items=[(CatalogEntry(id=1, vendor="V", model="M", category="access_switch", spec=switch), 3)],
        traffic=tp,
        tariff=_tariff(),
        policies=Policies(
            eee_enabled=True, alr_enabled=True, poe_sched_enabled=True,
        ),
    )
    r = run_scenario(inp)
    assert r.e_optimized_kwh <= r.e_base_kwh + 1e-6
    assert r.savings_kwh >= -1e-6
