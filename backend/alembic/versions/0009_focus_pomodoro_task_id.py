"""link focus and pomodoro sessions to tasks

Revision ID: 0009_focus_pomodoro_task
Revises: 0008_tasks_energy
Create Date: 2026-05-12
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_focus_pomodoro_task"
down_revision: Union[str, None] = "0008_tasks_energy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("focus_sessions", sa.Column("task_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_focus_sessions_task_id_tasks",
        "focus_sessions",
        "tasks",
        ["task_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column("pomodoro_sessions", sa.Column("task_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_pomodoro_sessions_task_id_tasks",
        "pomodoro_sessions",
        "tasks",
        ["task_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_pomodoro_sessions_task_id_tasks", "pomodoro_sessions", type_="foreignkey")
    op.drop_column("pomodoro_sessions", "task_id")
    op.drop_constraint("fk_focus_sessions_task_id_tasks", "focus_sessions", type_="foreignkey")
    op.drop_column("focus_sessions", "task_id")
