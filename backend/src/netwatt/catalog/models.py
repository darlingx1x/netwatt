from __future__ import annotations

from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from netwatt.db import Base


class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(primary_key=True)
    vendor: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    ports_total: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    poe_ports: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    poe_budget_w: Mapped[Decimal] = mapped_column(
        Numeric(8, 2), nullable=False, default=0, server_default="0"
    )
    p_idle_w: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    p_max_w: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    eee_supported: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    alr_supported: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    poe_scheduling: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    spec_url: Mapped[str | None] = mapped_column(String, nullable=True)
    year_released: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "category IN ('access_switch','distribution_switch','core_switch',"
            "'router','wifi_ap','server','ups','firewall')",
            name="equipment_category_check",
        ),
        UniqueConstraint("vendor", "model", name="equipment_vendor_model_unique"),
    )
