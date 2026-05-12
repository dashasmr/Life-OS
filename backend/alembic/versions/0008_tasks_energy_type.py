"""add task energy_type

Revision ID: 0008_tasks_energy
Revises: 0007_tasks_priority_due
Create Date: 2026-05-12 12:00:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_tasks_energy"
down_revision: Union[str, None] = "0007_tasks_priority_due"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("energy_type", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("tasks", "energy_type")
