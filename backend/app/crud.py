from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.database import settings
from app.models import (
    AIReview,
    CleaningZone,
    Event,
    FinanceTransaction,
    FocusSession,
    Goal,
    PomodoroSession,
    RecommendationFeedback,
    Task,
)
from app.services.insights import build_daily_insight
from app.services.realtime import publish_app_update
from app.schemas import (
    CleaningZoneCreate,
    EventCreate,
    FinanceTransactionCreate,
    FinanceKind,
    FocusSessionCreate,
    PomodoroSessionCreate,
    TaskCreate,
    TaskStatus,
)


def create_event(db: Session, data: EventCreate) -> Event:
    event = Event(type=data.type, source=data.source, payload=data.payload)
    db.add(event)
    db.commit()
    db.refresh(event)
    publish_app_update("event_created", event_type=data.type)
    return event


def list_events(db: Session, limit: int = 50, offset: int = 0, event_type: str | None = None) -> list[Event]:
    stmt = select(Event).order_by(desc(Event.created_at)).offset(offset).limit(limit)
    if event_type:
        stmt = stmt.where(Event.type == event_type)
    return list(db.execute(stmt).scalars().all())


def create_task(db: Session, data: TaskCreate) -> Task:
    task = Task(
        title=data.title,
        status="todo",
        priority=data.priority,
        due_date=data.due_date,
        energy_type=data.energy_type,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    publish_app_update("task_created")
    return task


def list_tasks(db: Session, limit: int = 50, offset: int = 0, status: TaskStatus | None = None) -> list[Task]:
    stmt = select(Task).order_by(desc(Task.created_at)).offset(offset).limit(limit)
    if status:
        stmt = stmt.where(Task.status == status)
    return list(db.execute(stmt).scalars().all())


def update_task_status(db: Session, task_id: str, status: TaskStatus) -> Task | None:
    task = db.get(Task, task_id)
    if not task:
        return None

    task.status = status
    task.completed_at = datetime.now(timezone.utc) if status == "done" else None

    if status == "done":
        event_type = "task_completed"
    else:
        event_type = None

    if event_type:
        event = Event(
            type=event_type,
            source="web",
            payload={"task_id": task.id, "title": task.title, "status": task.status},
        )
        db.add(event)

    db.commit()
    db.refresh(task)
    publish_app_update("task_status_updated", status=status)
    return task


def get_daily_summary(db: Session, target_date: date) -> dict[str, int | str]:
    day_start = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    base_events_stmt = select(func.count(Event.id)).where(
        Event.created_at >= day_start,
        Event.created_at < day_end,
    )
    events_total = db.execute(base_events_stmt).scalar_one()

    def event_count(event_type: str) -> int:
        stmt = base_events_stmt.where(Event.type == event_type)
        return db.execute(stmt).scalar_one()

    tasks_created_stmt = select(func.count(Task.id)).where(
        Task.created_at >= day_start,
        Task.created_at < day_end,
    )
    tasks_created = db.execute(tasks_created_stmt).scalar_one()
    tasks_in_progress_stmt = select(func.count(Task.id)).where(Task.status == "in_progress")
    tasks_in_progress = db.execute(tasks_in_progress_stmt).scalar_one()

    finance_sum_stmt = select(func.coalesce(func.sum(FinanceTransaction.amount), 0)).where(
        FinanceTransaction.created_at >= day_start,
        FinanceTransaction.created_at < day_end,
    )
    income_total = float(db.execute(finance_sum_stmt.where(FinanceTransaction.kind == "income")).scalar_one())
    expense_total = float(db.execute(finance_sum_stmt.where(FinanceTransaction.kind == "expense")).scalar_one())

    return {
        "date": target_date.isoformat(),
        "events_total": events_total,
        "tasks_created": tasks_created,
        "tasks_in_progress": tasks_in_progress,
        "tasks_completed": event_count("task_completed"),
        "pomodoros_completed": event_count("pomodoro_completed"),
        "income_added": event_count("income_added"),
        "expenses_added": event_count("expense_added"),
        "cleanings_done": event_count("cleaning_done"),
        "income_total": income_total,
        "expense_total": expense_total,
        "balance_delta": income_total - expense_total,
    }


def create_finance_transaction(db: Session, data: FinanceTransactionCreate) -> FinanceTransaction:
    transaction = FinanceTransaction(
        kind=data.kind,
        amount=data.amount,
        category=data.category,
        note=data.note,
    )
    db.add(transaction)
    db.flush()

    event_type = "income_added" if data.kind == "income" else "expense_added"
    event = Event(
        type=event_type,
        source="web",
        payload={
            "transaction_id": transaction.id,
            "kind": data.kind,
            "amount": data.amount,
            "category": data.category,
        },
    )
    db.add(event)

    db.commit()
    db.refresh(transaction)
    publish_app_update("finance_transaction_created", kind=data.kind)
    return transaction


def list_finance_transactions(
    db: Session, limit: int = 50, offset: int = 0, kind: FinanceKind | None = None
) -> list[FinanceTransaction]:
    stmt = select(FinanceTransaction).order_by(desc(FinanceTransaction.created_at)).offset(offset).limit(limit)
    if kind:
        stmt = stmt.where(FinanceTransaction.kind == kind)
    return list(db.execute(stmt).scalars().all())


def finance_totals_in_range(db: Session, range_start: datetime, range_end: datetime) -> dict[str, float]:
    """Sum income and expenses with created_at in [range_start, range_end). All rows are included (no limit)."""
    if range_start >= range_end:
        return {"income_total": 0.0, "expense_total": 0.0, "balance_delta": 0.0}

    income_stmt = select(func.coalesce(func.sum(FinanceTransaction.amount), 0)).where(
        FinanceTransaction.kind == "income",
        FinanceTransaction.created_at >= range_start,
        FinanceTransaction.created_at < range_end,
    )
    expense_stmt = select(func.coalesce(func.sum(FinanceTransaction.amount), 0)).where(
        FinanceTransaction.kind == "expense",
        FinanceTransaction.created_at >= range_start,
        FinanceTransaction.created_at < range_end,
    )
    income_total = float(db.execute(income_stmt).scalar_one())
    expense_total = float(db.execute(expense_stmt).scalar_one())
    return {
        "income_total": income_total,
        "expense_total": expense_total,
        "balance_delta": income_total - expense_total,
    }


def _cleaning_status(last_cleaned_at: datetime | None, frequency_days: int) -> str:
    if not last_cleaned_at:
        return "overdue"
    next_due = last_cleaned_at + timedelta(days=frequency_days)
    now = datetime.now(timezone.utc)
    if now > next_due:
        return "overdue"
    if now + timedelta(days=1) >= next_due:
        return "soon"
    return "ok"


def create_cleaning_zone(db: Session, data: CleaningZoneCreate) -> CleaningZone:
    zone = CleaningZone(name=data.name, frequency_days=data.frequency_days)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    publish_app_update("cleaning_zone_created")
    return zone


def list_cleaning_zones(db: Session) -> list[dict]:
    zones = list(db.execute(select(CleaningZone).order_by(CleaningZone.name.asc())).scalars().all())
    result = []
    for zone in zones:
        result.append(
            {
                "id": zone.id,
                "name": zone.name,
                "frequency_days": zone.frequency_days,
                "last_cleaned_at": zone.last_cleaned_at,
                "created_at": zone.created_at,
                "status": _cleaning_status(zone.last_cleaned_at, zone.frequency_days),
            }
        )
    return result


def mark_cleaning_done(db: Session, zone_id: str, cleaned_at: datetime | None = None) -> dict | None:
    zone = db.get(CleaningZone, zone_id)
    if not zone:
        return None
    zone.last_cleaned_at = cleaned_at or datetime.now(timezone.utc)
    db.add(
        Event(
            type="cleaning_done",
            source="web",
            payload={"zone_id": zone.id, "zone_name": zone.name},
        )
    )
    db.commit()
    db.refresh(zone)
    publish_app_update("cleaning_done")
    return {
        "id": zone.id,
        "name": zone.name,
        "frequency_days": zone.frequency_days,
        "last_cleaned_at": zone.last_cleaned_at,
        "created_at": zone.created_at,
        "status": _cleaning_status(zone.last_cleaned_at, zone.frequency_days),
    }


def start_focus_session(db: Session, data: FocusSessionCreate) -> FocusSession:
    session = FocusSession(label=data.label, task_id=data.task_id)
    db.add(session)
    db.flush()
    started_payload: dict = {"focus_session_id": session.id, "label": session.label}
    if session.task_id:
        task = db.get(Task, session.task_id)
        if task:
            started_payload["task_id"] = task.id
            started_payload["task_title"] = task.title
    db.add(
        Event(
            type="focus_started",
            source="web",
            payload=started_payload,
        )
    )
    db.commit()
    db.refresh(session)
    publish_app_update("focus_session_started")
    return session


def stop_focus_session(db: Session, session_id: str) -> FocusSession | None:
    session = db.get(FocusSession, session_id)
    if not session or session.ended_at:
        return None
    session.ended_at = datetime.now(timezone.utc)
    session.duration_seconds = int((session.ended_at - session.started_at).total_seconds())

    task_title: str | None = None
    if session.task_id:
        task = db.get(Task, session.task_id)
        if task:
            task_title = task.title

    duration_minutes = (
        max(0, int(round(session.duration_seconds / 60))) if session.duration_seconds is not None else 0
    )

    db.add(
        Event(
            type="focus_session_completed",
            source="web",
            payload={
                "focus_session_id": session.id,
                "task_id": session.task_id,
                "task_title": task_title,
                "duration_minutes": duration_minutes,
                "duration_seconds": session.duration_seconds,
                "started_at": session.started_at.isoformat(),
                "ended_at": session.ended_at.isoformat(),
            },
        )
    )
    db.commit()
    db.refresh(session)
    publish_app_update("focus_session_stopped")
    return session


def list_focus_sessions(db: Session, limit: int = 20, offset: int = 0) -> list[FocusSession]:
    stmt = select(FocusSession).order_by(desc(FocusSession.started_at)).offset(offset).limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_daily_insight(db: Session, target_date: date) -> dict:
    summary = get_daily_summary(db, target_date)
    day_start = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
    day_end = day_start + timedelta(days=1)

    focus_duration_stmt = select(func.coalesce(func.sum(FocusSession.duration_seconds), 0)).where(
        FocusSession.started_at >= day_start,
        FocusSession.started_at < day_end,
    )
    focus_seconds = int(db.execute(focus_duration_stmt).scalar_one() or 0)
    focus_minutes = max(0, round(focus_seconds / 60))
    return build_daily_insight(
        summary=summary,
        focus_minutes=focus_minutes,
        provider=settings.ai_provider,
        openai_api_key=settings.openai_api_key,
        openai_model=settings.openai_model,
    )


def start_pomodoro_session(db: Session, data: PomodoroSessionCreate) -> PomodoroSession:
    session = PomodoroSession(
        label=data.label,
        task_id=data.task_id,
        work_minutes=data.work_minutes,
        break_minutes=data.break_minutes,
        status="running",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    publish_app_update("pomodoro_started")
    return session


def complete_pomodoro_session(db: Session, session_id: str) -> PomodoroSession | None:
    session = db.get(PomodoroSession, session_id)
    if not session or session.status != "running":
        return None
    session.status = "completed"
    session.ended_at = datetime.now(timezone.utc)

    pomodoro_payload: dict = {
        "pomodoro_session_id": session.id,
        "work_minutes": session.work_minutes,
        "break_minutes": session.break_minutes,
    }
    if session.task_id:
        task = db.get(Task, session.task_id)
        pomodoro_payload["task_id"] = session.task_id
        pomodoro_payload["task_title"] = task.title if task else None

    db.add(
        Event(
            type="pomodoro_completed",
            source="web",
            payload=pomodoro_payload,
        )
    )
    db.commit()
    db.refresh(session)
    publish_app_update("pomodoro_completed")
    return session


def list_pomodoro_sessions(db: Session, limit: int = 20, offset: int = 0) -> list[PomodoroSession]:
    stmt = select(PomodoroSession).order_by(desc(PomodoroSession.started_at)).offset(offset).limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_ai_review_by_date(db: Session, review_date: date) -> AIReview | None:
    stmt = select(AIReview).where(AIReview.review_date == review_date)
    return db.execute(stmt).scalar_one_or_none()


def list_ai_reviews(db: Session, limit: int = 60, offset: int = 0) -> list[AIReview]:
    stmt = (
        select(AIReview).order_by(desc(AIReview.review_date)).offset(offset).limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def upsert_ai_review(
    db: Session,
    *,
    review_date: date,
    title: str,
    summary: str,
    wins: list[str],
    concerns: list[str],
    tomorrow_plan: list[str],
    fallback: bool,
) -> AIReview:
    """Single row per `review_date`; updates in place on regenerate (no duplicate dates)."""
    existing = get_ai_review_by_date(db, review_date)
    if existing:
        existing.title = title
        existing.summary = summary
        existing.wins = wins
        existing.concerns = concerns
        existing.tomorrow_plan = tomorrow_plan
        existing.fallback = fallback
        db.commit()
        db.refresh(existing)
        publish_app_update("ai_review_upserted", review_date=review_date.isoformat())
        return existing
    row = AIReview(
        review_date=review_date,
        title=title,
        summary=summary,
        wins=wins,
        concerns=concerns,
        tomorrow_plan=tomorrow_plan,
        fallback=fallback,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    publish_app_update("ai_review_created", review_date=review_date.isoformat())
    return row


def create_goal(
    db: Session,
    *,
    title: str,
    category: str,
    target_value: float,
    unit: str,
    period: str,
) -> Goal:
    row = Goal(
        title=title.strip() or "Goal",
        category=category,
        target_value=target_value,
        unit=unit,
        period=period,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    publish_app_update("goal_created")
    return row


def list_goals(db: Session) -> list[Goal]:
    stmt = select(Goal).order_by(Goal.created_at.desc())
    return list(db.execute(stmt).scalars().all())


def delete_goal(db: Session, goal_id: str) -> bool:
    row = db.get(Goal, goal_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    publish_app_update("goal_deleted")
    return True


def create_recommendation_feedback(
    db: Session,
    *,
    recommendation_id: str,
    outcome: str,
    local_hour: int | None,
) -> RecommendationFeedback:
    row = RecommendationFeedback(
        recommendation_id=recommendation_id.strip()[:128],
        outcome=outcome,
        local_hour=local_hour,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    publish_app_update("recommendation_feedback_created")
    return row


def list_recommendation_feedback_since(db: Session, since: datetime) -> list[RecommendationFeedback]:
    stmt = (
        select(RecommendationFeedback)
        .where(RecommendationFeedback.created_at >= since)
        .order_by(RecommendationFeedback.created_at.asc())
    )
    return list(db.execute(stmt).scalars().all())
