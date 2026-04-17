"""initial schema with 7 tables

Revision ID: 0001
Revises:
Create Date: 2026-04-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import CITEXT, INET, JSONB

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")

    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("email", CITEXT, nullable=False, unique=True),
        sa.Column("full_name", sa.String, nullable=False),
        sa.Column("password_hash", sa.String, nullable=False),
        sa.Column("role", sa.String, nullable=False),
        sa.Column("lang", sa.String, nullable=False, server_default="ru"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("TRUE")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
        sa.CheckConstraint("role IN ('admin','engineer')", name="users_role_check"),
        sa.CheckConstraint("lang IN ('ru','uz','en')", name="users_lang_check"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "auth_tokens",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "user_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String, nullable=False),
        sa.Column("token_hash", sa.String, nullable=False),
        sa.Column(
            "parent_id",
            sa.BigInteger,
            sa.ForeignKey("auth_tokens.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("user_agent", sa.String, nullable=True),
        sa.Column("ip", INET, nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
        sa.CheckConstraint("kind IN ('access','refresh')", name="auth_tokens_kind_check"),
    )
    op.create_index("ix_auth_tokens_token_hash", "auth_tokens", ["token_hash"])
    op.create_index(
        "ix_auth_tokens_user_kind_revoked",
        "auth_tokens",
        ["user_id", "kind", "revoked_at"],
    )

    op.create_table(
        "equipment",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("vendor", sa.String, nullable=False),
        sa.Column("model", sa.String, nullable=False),
        sa.Column("category", sa.String, nullable=False),
        sa.Column("ports_total", sa.Integer, nullable=False, server_default="0"),
        sa.Column("poe_ports", sa.Integer, nullable=False, server_default="0"),
        sa.Column("poe_budget_w", sa.Numeric(8, 2), nullable=False, server_default="0"),
        sa.Column("p_idle_w", sa.Numeric(8, 2), nullable=False),
        sa.Column("p_max_w", sa.Numeric(8, 2), nullable=False),
        sa.Column("eee_supported", sa.Boolean, nullable=False, server_default=sa.text("FALSE")),
        sa.Column("alr_supported", sa.Boolean, nullable=False, server_default=sa.text("FALSE")),
        sa.Column("poe_scheduling", sa.Boolean, nullable=False, server_default=sa.text("FALSE")),
        sa.Column("spec_url", sa.String, nullable=True),
        sa.Column("year_released", sa.Integer, nullable=True),
        sa.CheckConstraint(
            "category IN ('access_switch','distribution_switch','core_switch',"
            "'router','wifi_ap','server','ups','firewall')",
            name="equipment_category_check",
        ),
        sa.UniqueConstraint("vendor", "model", name="equipment_vendor_model_unique"),
    )

    op.create_table(
        "scenarios",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "owner_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("notes", sa.String, nullable=True),
        sa.Column("tariff", JSONB, nullable=False),
        sa.Column("traffic", JSONB, nullable=False),
        sa.Column("policies", JSONB, nullable=False),
        sa.Column("ef_grid", sa.Numeric(6, 3), nullable=False, server_default="0.468"),
        sa.Column("status", sa.String, nullable=False, server_default="draft"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
        sa.CheckConstraint(
            "status IN ('draft','calculating','ready','failed')",
            name="scenarios_status_check",
        ),
    )
    op.create_index("ix_scenarios_owner_id", "scenarios", ["owner_id"])

    op.create_table(
        "scenario_items",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "scenario_id",
            sa.BigInteger,
            sa.ForeignKey("scenarios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "equipment_id",
            sa.BigInteger,
            sa.ForeignKey("equipment.id"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.Column("location", sa.String, nullable=True),
        sa.CheckConstraint("quantity > 0", name="scenario_items_quantity_positive"),
        sa.UniqueConstraint(
            "scenario_id", "equipment_id", "location", name="scenario_items_unique"
        ),
    )

    op.create_table(
        "scenario_results",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "scenario_id",
            sa.BigInteger,
            sa.ForeignKey("scenarios.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("e_base_kwh", sa.Numeric(14, 2), nullable=False),
        sa.Column("e_optimized_kwh", sa.Numeric(14, 2), nullable=False),
        sa.Column("savings_kwh", sa.Numeric(14, 2), nullable=False),
        sa.Column("savings_money", sa.Numeric(16, 2), nullable=False),
        sa.Column("co2_saved_kg", sa.Numeric(14, 2), nullable=False),
        sa.Column("payback_years", sa.Numeric(6, 2), nullable=True),
        sa.Column("npv", sa.Numeric(16, 2), nullable=True),
        sa.Column("breakdown", JSONB, nullable=False),
        sa.Column("per_device", JSONB, nullable=False),
        sa.Column(
            "calculated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column(
            "user_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String, nullable=False),
        sa.Column("entity", sa.String, nullable=False),
        sa.Column("entity_id", sa.BigInteger, nullable=True),
        sa.Column("meta", JSONB, nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")
        ),
    )
    op.create_index("ix_audit_log_user_created", "audit_log", ["user_id", "created_at"])
    op.create_index("ix_audit_log_entity", "audit_log", ["entity", "entity_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_log_entity", table_name="audit_log")
    op.drop_index("ix_audit_log_user_created", table_name="audit_log")
    op.drop_table("audit_log")
    op.drop_table("scenario_results")
    op.drop_table("scenario_items")
    op.drop_index("ix_scenarios_owner_id", table_name="scenarios")
    op.drop_table("scenarios")
    op.drop_table("equipment")
    op.drop_index("ix_auth_tokens_user_kind_revoked", table_name="auth_tokens")
    op.drop_index("ix_auth_tokens_token_hash", table_name="auth_tokens")
    op.drop_table("auth_tokens")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS citext")
