from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from netwatt.db import Base

if TYPE_CHECKING:
    from netwatt.users.models import User


class Scenario(Base):
    __tablename__ = "scenarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    tariff: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    traffic: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    policies: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    ef_grid: Mapped[Decimal] = mapped_column(
        Numeric(6, 3), nullable=False, default=Decimal("0.468"), server_default="0.468"
    )
    status: Mapped[str] = mapped_column(
        String, nullable=False, default="draft", server_default="draft"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    owner: Mapped[User] = relationship(back_populates="scenarios")
    items: Mapped[list[ScenarioItem]] = relationship(
        back_populates="scenario", cascade="all, delete-orphan"
    )
    result: Mapped[ScenarioResult | None] = relationship(
        back_populates="scenario", cascade="all, delete-orphan", uselist=False
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','calculating','ready','failed')",
            name="scenarios_status_check",
        ),
        Index("ix_scenarios_owner_id", "owner_id"),
    )


class ScenarioItem(Base):
    __tablename__ = "scenario_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    scenario_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False
    )
    equipment_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("equipment.id"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    location: Mapped[str | None] = mapped_column(String, nullable=True)

    scenario: Mapped[Scenario] = relationship(back_populates="items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="scenario_items_quantity_positive"),
        UniqueConstraint(
            "scenario_id", "equipment_id", "location", name="scenario_items_unique"
        ),
    )


class ScenarioResult(Base):
    __tablename__ = "scenario_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    scenario_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    e_base_kwh: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    e_optimized_kwh: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    savings_kwh: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    savings_money: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    co2_saved_kg: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    payback_years: Mapped[Decimal | None] = mapped_column(Numeric(6, 2), nullable=True)
    npv: Mapped[Decimal | None] = mapped_column(Numeric(16, 2), nullable=True)
    breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    per_device: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    scenario: Mapped[Scenario] = relationship(back_populates="result")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_audit_log_user_created", "user_id", "created_at"),
        Index("ix_audit_log_entity", "entity", "entity_id"),
    )
