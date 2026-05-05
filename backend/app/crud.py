from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.database import settings
from app.models import CleaningZone, Event, FinanceTransaction, FocusSession, PomodoroSession, Task
from app.services.insights import build_daily_insight
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
    return event


def list_events(db: Session, limit: int = 50, offset: int = 0, event_type: str | None = None) -> list[Event]:
    stmt = select(Event).order_by(desc(Event.created_at)).offset(offset).limit(limit)
    if event_type:
        stmt = stmt.where(Event.type == event_type)
    return list(db.execute(stmt).scalars().all())


def create_task(db: Session, data: TaskCreate) -> Task:
    task = Task(title=data.title, status="todo")
    db.add(task)
    db.commit()
    db.refresh(task)
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

    if status == "in_progress":
        event_type = "task_in_progress"
    elif status == "done":
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
        "tasks_in_progress": event_count("task_in_progress"),
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
    return transaction


def list_finance_transactions(
    db: Session, limit: int = 50, offset: int = 0, kind: FinanceKind | None = None
) -> list[FinanceTransaction]:
    stmt = select(FinanceTransaction).order_by(desc(FinanceTransaction.created_at)).offset(offset).limit(limit)
    if kind:
        stmt = stmt.where(FinanceTransaction.kind == kind)
    return list(db.execute(stmt).scalars().all())


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
    return {
        "id": zone.id,
        "name": zone.name,
        "frequency_days": zone.frequency_days,
        "last_cleaned_at": zone.last_cleaned_at,
        "created_at": zone.created_at,
        "status": _cleaning_status(zone.last_cleaned_at, zone.frequency_days),
    }


def start_focus_session(db: Session, data: FocusSessionCreate) -> FocusSession:
    session = FocusSession(label=data.label)
    db.add(session)
    db.flush()
    db.add(
        Event(
            type="focus_started",
            source="web",
            payload={"focus_session_id": session.id, "label": session.label},
        )
    )
    db.commit()
    db.refresh(session)
    return session


def stop_focus_session(db: Session, session_id: str) -> FocusSession | None:
    session = db.get(FocusSession, session_id)
    if not session or session.ended_at:
        return None
    session.ended_at = datetime.now(timezone.utc)
    session.duration_seconds = int((session.ended_at - session.started_at).total_seconds())
    db.add(
        Event(
            type="focus_ended",
            source="web",
            payload={"focus_session_id": session.id, "duration_seconds": session.duration_seconds},
        )
    )
    db.commit()
    db.refresh(session)
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
        work_minutes=data.work_minutes,
        break_minutes=data.break_minutes,
        status="running",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def complete_pomodoro_session(db: Session, session_id: str) -> PomodoroSession | None:
    session = db.get(PomodoroSession, session_id)
    if not session or session.status != "running":
        return None
    session.status = "completed"
    session.ended_at = datetime.now(timezone.utc)
    db.add(
        Event(
            type="pomodoro_completed",
            source="web",
            payload={
                "pomodoro_session_id": session.id,
                "work_minutes": session.work_minutes,
                "break_minutes": session.break_minutes,
            },
        )
    )
    db.commit()
    db.refresh(session)
    return session


def list_pomodoro_sessions(db: Session, limit: int = 20, offset: int = 0) -> list[PomodoroSession]:
    stmt = select(PomodoroSession).order_by(desc(PomodoroSession.started_at)).offset(offset).limit(limit)
    return list(db.execute(stmt).scalars().all())
