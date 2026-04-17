from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class EquipmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vendor: str
    model: str
    category: str
    ports_total: int
    poe_ports: int
    poe_budget_w: Decimal
    p_idle_w: Decimal
    p_max_w: Decimal
    eee_supported: bool
    alr_supported: bool
    poe_scheduling: bool
    spec_url: str | None
    year_released: int | None


class EquipmentCreate(BaseModel):
    vendor: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=200)
    category: str = Field(
        pattern="^(access_switch|distribution_switch|core_switch|router|wifi_ap|server|ups|firewall)$"
    )
    ports_total: int = Field(ge=0, default=0)
    poe_ports: int = Field(ge=0, default=0)
    poe_budget_w: Decimal = Field(ge=0, default=Decimal("0"))
    p_idle_w: Decimal = Field(gt=0)
    p_max_w: Decimal = Field(gt=0)
    eee_supported: bool = False
    alr_supported: bool = False
    poe_scheduling: bool = False
    spec_url: str | None = None
    year_released: int | None = None


class EquipmentUpdate(BaseModel):
    vendor: str | None = None
    model: str | None = None
    category: str | None = None
    ports_total: int | None = None
    poe_ports: int | None = None
    poe_budget_w: Decimal | None = None
    p_idle_w: Decimal | None = None
    p_max_w: Decimal | None = None
    eee_supported: bool | None = None
    alr_supported: bool | None = None
    poe_scheduling: bool | None = None
    spec_url: str | None = None
    year_released: int | None = None


class EquipmentList(BaseModel):
    items: list[EquipmentRead]
    total: int
    offset: int
    limit: int
