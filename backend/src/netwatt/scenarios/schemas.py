from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TariffIn(BaseModel):
    day: float = Field(ge=0)
    peak: float = Field(ge=0)
    night: float = Field(ge=0)
    currency: str = "UZS"


class TrafficIn(BaseModel):
    day_util: float = Field(ge=0, le=1)
    peak_util: float = Field(ge=0, le=1)
    night_util: float = Field(ge=0, le=1)
    day_hours: float = Field(ge=0, le=24)
    peak_hours: float = Field(ge=0, le=24)
    night_hours: float = Field(ge=0, le=24)


class PoliciesIn(BaseModel):
    eee: dict[str, Any] = Field(default_factory=dict)
    alr: dict[str, Any] = Field(default_factory=dict)
    poe_sched: dict[str, Any] = Field(default_factory=dict)
    consolidation: dict[str, Any] = Field(default_factory=dict)


class ScenarioItemCreate(BaseModel):
    equipment_id: int
    quantity: int = Field(gt=0, le=500)
    location: str | None = None


class ScenarioItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    equipment_id: int
    quantity: int
    location: str | None


class ScenarioCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    notes: str | None = None
    tariff: TariffIn
    traffic: TrafficIn
    policies: PoliciesIn
    ef_grid: float = Field(default=0.468, ge=0, le=2)
    items: list[ScenarioItemCreate] = Field(default_factory=list)


class ScenarioUpdate(BaseModel):
    name: str | None = None
    notes: str | None = None
    tariff: TariffIn | None = None
    traffic: TrafficIn | None = None
    policies: PoliciesIn | None = None
    ef_grid: float | None = Field(default=None, ge=0, le=2)


class ScenarioResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    e_base_kwh: Decimal
    e_optimized_kwh: Decimal
    savings_kwh: Decimal
    savings_money: Decimal
    co2_saved_kg: Decimal
    payback_years: Decimal | None
    npv: Decimal | None
    breakdown: dict[str, Any]
    per_device: list[dict[str, Any]]
    calculated_at: datetime


class ScenarioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    notes: str | None
    tariff: dict[str, Any]
    traffic: dict[str, Any]
    policies: dict[str, Any]
    ef_grid: Decimal
    status: str
    created_at: datetime
    updated_at: datetime
    items: list[ScenarioItemRead] = Field(default_factory=list)
    result: ScenarioResultRead | None = None
