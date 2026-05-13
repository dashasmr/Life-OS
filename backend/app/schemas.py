from datetime import date, datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


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


class DailyReviewRequest(BaseModel):
    """UTC calendar date, consistent with `/analytics/daily-summary`. Defaults to server today."""

    model_config = ConfigDict(populate_by_name=True)

    # Field name cannot be `date` — it shadows the `date` type in this scope.
    review_day: Optional[date] = Field(default=None, alias="date")
    regenerate: bool = False


class DailyReviewRead(BaseModel):
    date: str
    title: str
    summary: str
    wins: list[str]
    concerns: list[str]
    tomorrowPlan: list[str]
    fallback: bool = False
    id: str | None = None
    created_at: datetime | None = None
    from_storage: bool = False


class MonthlyReviewRequest(BaseModel):
    """
    Half-open window [monthFrom, monthTo) in ISO-8601, aligned with the browser's `getLocalMonthRangeIso`.
    """

    model_config = ConfigDict(populate_by_name=True)

    month_from: str = Field(..., alias="monthFrom")
    month_to: str = Field(..., alias="monthTo")


class MonthlyReviewRead(BaseModel):
    monthLabel: str
    title: str
    summary: str
    wins: list[str]
    risks: list[str]
    patterns: list[str]
    nextMonthFocus: list[str]
    fallback: bool = False


class BehaviorPatternRead(BaseModel):
    """Rule-based behavioral signal derived from historical events, snapshots, or finance rows."""

    id: str
    category: Literal["focus", "cleaning", "finance"]
    confidence: float = Field(ge=0, le=1)
    message: str


class BehaviorPatternsPayload(BaseModel):
    """Envelope for `/analytics/behavior-patterns` including sample-quality metadata."""

    model_config = ConfigDict(populate_by_name=True)

    patterns: list[BehaviorPatternRead]
    insufficient_history: bool = Field(False, serialization_alias="insufficientHistory")


class RiskSignalRead(BaseModel):
    """Early warning derived from trends and thresholds (not LLM output)."""

    id: str
    severity: Literal["low", "medium", "high"]
    category: Literal["focus", "finance", "environment"]
    message: str
    explanation: str
    detectedAt: str


GoalCategory = Literal["productivity", "finance", "home"]
GoalUnit = Literal["tasks", "eur", "percent", "minutes"]
GoalPeriod = Literal["weekly", "monthly"]
GoalStatus = Literal["on_track", "at_risk", "completed"]


class GoalCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str = Field(min_length=1, max_length=200)
    category: GoalCategory
    targetValue: float = Field(gt=0)
    unit: GoalUnit
    period: GoalPeriod


class GoalRead(BaseModel):
    id: str
    title: str
    category: GoalCategory
    targetValue: float
    currentValue: float
    unit: GoalUnit
    period: GoalPeriod
    status: GoalStatus


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


RecommendationOutcome = Literal["accepted", "ignored", "dismissed"]


class RecommendationFeedbackCreate(BaseModel):
    recommendation_id: str = Field(min_length=1, max_length=128)
    outcome: RecommendationOutcome
    """ISO-8601 timestamp from client (stored rows still use server `created_at`)."""
    timestamp: datetime | None = None
    """Local clock hour (0–23) when feedback applies — used for time-of-day adaptation."""
    local_hour: int | None = Field(default=None, ge=0, le=23)


class RecommendationFeedbackRead(BaseModel):
    id: str
    recommendation_id: str
    outcome: str
    local_hour: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class RecommendationAdjustmentRead(BaseModel):
    """Derived tuning for one recommendation id (merged timing + priority + frequency signals)."""

    priority_weight: float = 1.0
    confidence: float = 0.55
    avoid_hours_local: list[int] = Field(default_factory=list)
    prefer_hours_local: list[int] = Field(default_factory=list)
    defer_show_until_hour_local: int | None = None
    min_minutes_between_suggestions: int = 0


class AdaptiveContextRead(BaseModel):
    """Aggregated adaptive tuning consumed by the recommendation engine on the client."""

    adjustments: dict[str, RecommendationAdjustmentRead]


DetectedHabitCategory = Literal["focus", "cleaning", "finance", "productivity"]

HabitSupportActionType = Literal["navigate", "mutation", "plan_item"]


class HabitSupportActionRead(BaseModel):
    """One actionable step derived from a detected habit."""

    id: str
    habitId: str
    label: str
    type: HabitSupportActionType
    target: str | None = None
    payload: dict[str, Any] | None = None


class DetectedHabitRead(BaseModel):
    """Auto-detected behavioral routine from historical events (not user-declared)."""

    id: str
    category: DetectedHabitCategory
    confidence: float = Field(ge=0.0, le=1.0)
    frequency: str
    message: str
    suggestedActions: list[HabitSupportActionRead] = Field(default_factory=list)
