from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import complete_pomodoro_session, list_pomodoro_sessions, start_pomodoro_session
from app.database import get_db
from app.models import Task
from app.schemas import PomodoroSessionCreate, PomodoroSessionRead

router = APIRouter(prefix="/pomodoro", tags=["pomodoro"])


@router.post("/sessions", response_model=PomodoroSessionRead, status_code=201)
def start_pomodoro_session_endpoint(payload: PomodoroSessionCreate, db: Session = Depends(get_db)):
    if payload.task_id:
        task = db.get(Task, payload.task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.status == "done":
            raise HTTPException(status_code=400, detail="Cannot link pomodoro to a completed task")
    return start_pomodoro_session(db, payload)


@router.post("/sessions/{session_id}/complete", response_model=PomodoroSessionRead)
def complete_pomodoro_session_endpoint(session_id: str, db: Session = Depends(get_db)):
    session = complete_pomodoro_session(db, session_id=session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Pomodoro session not found or already completed")
    return session


@router.get("/sessions", response_model=list[PomodoroSessionRead])
def list_pomodoro_sessions_endpoint(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return list_pomodoro_sessions(db, limit=limit, offset=offset)
