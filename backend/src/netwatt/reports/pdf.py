from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from netwatt.reports.i18n import translate
from netwatt.scenarios.models import Scenario
from netwatt.users.models import User

_TEMPLATES_DIR = Path(__file__).parent / "templates"
_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)


def render_pdf(scenario: Scenario, owner: User, lang: str = "ru") -> bytes:
    if scenario.result is None:
        raise ValueError("scenario_has_no_result")
    result = scenario.result
    # build dict view of result + scenario (Jinja works with objects or dicts, use objects)
    template = _env.get_template("report.html")
    html = template.render(
        lang=lang,
        t=translate(lang),
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        scenario=_scenario_view(scenario),
        owner=owner,
        policies=scenario.policies,
        result={
            "savings_kwh": float(result.savings_kwh),
            "savings_money": float(result.savings_money),
            "co2_saved_kg": float(result.co2_saved_kg),
            "e_base_kwh": float(result.e_base_kwh),
            "e_optimized_kwh": float(result.e_optimized_kwh),
            "breakdown": result.breakdown,
            "per_device": result.per_device,
        },
    )
    return HTML(string=html).write_pdf() or b""


class _TariffView:
    def __init__(self, data: dict) -> None:
        self.day = data.get("day", 0)
        self.peak = data.get("peak", 0)
        self.night = data.get("night", 0)


class _TrafficView:
    def __init__(self, data: dict) -> None:
        self.day_util = data.get("day_util", 0)
        self.peak_util = data.get("peak_util", 0)
        self.night_util = data.get("night_util", 0)


class _ScenarioView:
    def __init__(self, scenario: Scenario) -> None:
        self.name = scenario.name
        self.tariff = _TariffView(scenario.tariff)
        self.traffic = _TrafficView(scenario.traffic)
        self.ef_grid = float(scenario.ef_grid)


def _scenario_view(scenario: Scenario) -> _ScenarioView:
    return _ScenarioView(scenario)
