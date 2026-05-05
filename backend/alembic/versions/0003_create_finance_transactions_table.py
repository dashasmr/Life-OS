"""create finance transactions table

Revision ID: 0003_finance_transactions
Revises: 0002_create_tasks_table
Create Date: 2026-05-05 16:24:00
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_finance_transactions"
down_revision: Union[str, None] = "0002_create_tasks_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "finance_transactions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("note", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_finance_transactions_kind", "finance_transactions", ["kind"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_finance_transactions_kind", table_name="finance_transactions")
    op.drop_table("finance_transactions")
