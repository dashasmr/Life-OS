"""add task priority and due date

Revision ID: 0007_tasks_priority_due
Revises: 0006_pomodoro_sessions
Create Date: 2026-05-06 11:10:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_tasks_priority_due"
down_revision: Union[str, None] = "0006_pomodoro_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("priority", sa.String(length=16), nullable=False, server_default="medium"))
    op.add_column("tasks", sa.Column("due_date", sa.Date(), nullable=True))
    op.create_index("ix_tasks_priority", "tasks", ["priority"], unique=False)
    op.create_index("ix_tasks_due_date", "tasks", ["due_date"], unique=False)
    op.alter_column("tasks", "priority", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_tasks_due_date", table_name="tasks")
    op.drop_index("ix_tasks_priority", table_name="tasks")
    op.drop_column("tasks", "due_date")
    op.drop_column("tasks", "priority")

