"""recommendation_feedback table

Revision ID: 0013_recommendation_feedback
Revises: 0012_goals
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013_recommendation_feedback"
down_revision: Union[str, None] = "0012_goals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recommendation_feedback",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("recommendation_id", sa.String(length=128), nullable=False),
        sa.Column("outcome", sa.String(length=16), nullable=False),
        sa.Column("local_hour", sa.SmallInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(
        "ix_recommendation_feedback_recommendation_id",
        "recommendation_feedback",
        ["recommendation_id"],
    )
    op.create_index("ix_recommendation_feedback_created_at", "recommendation_feedback", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_recommendation_feedback_created_at", table_name="recommendation_feedback")
    op.drop_index("ix_recommendation_feedback_recommendation_id", table_name="recommendation_feedback")
    op.drop_table("recommendation_feedback")
