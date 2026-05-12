"""daily_snapshots table

Revision ID: 0010_daily_snapshots
Revises: 0009_focus_pomodoro_task
Create Date: 2026-05-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0010_daily_snapshots"
down_revision: Union[str, None] = "0009_focus_pomodoro_task"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "daily_snapshots",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("tasks_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("focus_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expenses_total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("cleaning_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("home_health_score", sa.Integer(), nullable=True),
        sa.Column("system_state", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "ix_daily_snapshots_snapshot_date",
        "daily_snapshots",
        ["snapshot_date"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_daily_snapshots_snapshot_date", table_name="daily_snapshots")
    op.drop_table("daily_snapshots")
