from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


EventType = Literal[
    "work_started",
    "focus_started",
    "focus_ended",
    "focus_session_completed",
    "pomodoro_completed",
    "task_completed",
    "income_added",
    "expense_added",
    "cleaning_done",
]
EventSource = Literal["web", "iot", "system"]
TaskStatus = Literal["todo", "in_progress", "done"]
TaskPriority = Literal["low", "medium", "high"]
TaskEnergyType = Literal["high_focus", "low_energy", "creative", "admin"]
FinanceKind = Literal["income", "expense"]
CleaningStatus = Literal["ok", "soon", "overdue"]


class EventCreate(BaseModel):
    type: EventType
    source: EventSource = "web"
    payload: dict[str, Any] = Field(default_factory=dict)


class EventRead(BaseModel):
    id: str
    type: str
    source: str
    payload: dict[str, Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    priority: TaskPriority = "medium"
    due_date: date | None = None
    energy_type: TaskEnergyType | None = None


class TaskStatusUpdate(BaseModel):
    status: TaskStatus


class TaskRead(BaseModel):
    id: str
    title: str
    status: TaskStatus
    priority: TaskPriority
    due_date: date | None
    energy_type: TaskEnergyType | None = None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class DailySummaryRead(BaseModel):
    date: str
    events_total: int
    tasks_created: int
    tasks_in_progress: int
    tasks_completed: int
    pomodoros_completed: int
    income_added: int
    expenses_added: int
    cleanings_done: int
    income_total: float
    expense_total: float
    balance_delta: float


class FinanceTransactionCreate(BaseModel):
    kind: FinanceKind
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=64)
    note: str | None = Field(default=None, max_length=255)


class FinanceTransactionRead(BaseModel):
    id: str
    kind: FinanceKind
    amount: float
    category: str
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class FinanceRangeSummaryRead(BaseModel):
    income_total: float
    expense_total: float
    balance_delta: float


class CleaningZoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    frequency_days: int = Field(ge=1, le=60)


class CleaningZoneRead(BaseModel):
    id: str
    name: str
    frequency_days: int
    last_cleaned_at: datetime | None
    status: CleaningStatus
    created_at: datetime


class CleaningMarkDone(BaseModel):
    cleaned_at: datetime | None = None


class FocusSessionCreate(BaseModel):
    label: str | None = Field(default=None, max_length=120)
    task_id: str | None = None


class FocusSessionRead(BaseModel):
    id: str
    label: str | None
    task_id: str | None
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None

    model_config = {"from_attributes": True}


class DailyInsightRead(BaseModel):
    date: str
    headline: str
    summary: str
    recommendations: list[str]


class PomodoroSessionCreate(BaseModel):
    label: str | None = Field(default=None, max_length=120)
    task_id: str | None = None
    work_minutes: int = Field(default=25, ge=10, le=120)
    break_minutes: int = Field(default=5, ge=1, le=60)


class PomodoroSessionRead(BaseModel):
    id: str
    label: str | None
    task_id: str | None
    work_minutes: int
    break_minutes: int
    status: str
    started_at: datetime
    ended_at: datetime | None

    model_config = {"from_attributes": True}


class DailySnapshotSystemState(BaseModel):
    mind: str
    home: str
    finance: str


class DailySnapshotRead(BaseModel):
    """Materialized daily metrics (UTC date) for analytics and time series."""

    date: str
    tasks_completed: int
    focus_minutes: int
    expenses_total: float
    cleaning_completed: int
    home_health_score: int | None
    system_state: DailySnapshotSystemState
    created_at: datetime
    updated_at: datetime
