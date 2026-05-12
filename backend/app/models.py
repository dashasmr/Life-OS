import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index("ix_events_created_at", "created_at"),
        Index("ix_events_type", "type"),
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="todo")
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    energy_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_tasks_status", "status"),
        Index("ix_tasks_priority", "priority"),
        Index("ix_tasks_due_date", "due_date"),
    )


class FinanceTransaction(Base):
    __tablename__ = "finance_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (Index("ix_finance_transactions_kind", "kind"),)


class CleaningZone(Base):
    __tablename__ = "cleaning_zones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    frequency_days: Mapped[int] = mapped_column(nullable=False, default=7)
    last_cleaned_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    task_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    started_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    ended_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(nullable=True)


class PomodoroSession(Base):
    __tablename__ = "pomodoro_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    task_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    work_minutes: Mapped[int] = mapped_column(nullable=False, default=25)
    break_minutes: Mapped[int] = mapped_column(nullable=False, default=5)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="running")
    started_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    ended_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DailySnapshot(Base):
    """Materialized end-of-day style metrics for analytics / time series (UTC calendar date)."""

    __tablename__ = "daily_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False, unique=True)
    tasks_completed: Mapped[int] = mapped_column(nullable=False, default=0)
    focus_minutes: Mapped[int] = mapped_column(nullable=False, default=0)
    expenses_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    cleaning_completed: Mapped[int] = mapped_column(nullable=False, default=0)
    home_health_score: Mapped[int | None] = mapped_column(nullable=True)
    system_state: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
