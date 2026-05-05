from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import Event, Task
from app.schemas import EventCreate, TaskCreate, TaskStatus


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
