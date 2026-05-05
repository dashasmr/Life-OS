from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import create_task, list_tasks, update_task_status
from app.database import get_db
from app.schemas import TaskCreate, TaskRead, TaskStatus, TaskStatusUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskRead, status_code=201)
def create_task_endpoint(payload: TaskCreate, db: Session = Depends(get_db)):
    return create_task(db, payload)


@router.get("", response_model=list[TaskRead])
def list_tasks_endpoint(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: TaskStatus | None = Query(None),
):
    return list_tasks(db, limit=limit, offset=offset, status=status)


@router.patch("/{task_id}/status", response_model=TaskRead)
def update_task_status_endpoint(task_id: str, payload: TaskStatusUpdate, db: Session = Depends(get_db)):
    task = update_task_status(db, task_id=task_id, status=payload.status)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
