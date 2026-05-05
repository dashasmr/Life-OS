"""create pomodoro sessions table

Revision ID: 0006_pomodoro_sessions
Revises: 0005_focus_sessions
Create Date: 2026-05-05 16:58:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_pomodoro_sessions"
down_revision: Union[str, None] = "0005_focus_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pomodoro_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=True),
        sa.Column("work_minutes", sa.Integer(), nullable=False),
        sa.Column("break_minutes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("pomodoro_sessions")
