from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import list_focus_sessions, start_focus_session, stop_focus_session
from app.database import get_db
from app.schemas import FocusSessionCreate, FocusSessionRead

router = APIRouter(prefix="/focus", tags=["focus"])


@router.post("/sessions", response_model=FocusSessionRead, status_code=201)
def start_focus_session_endpoint(payload: FocusSessionCreate, db: Session = Depends(get_db)):
    return start_focus_session(db, payload)


@router.post("/sessions/{session_id}/stop", response_model=FocusSessionRead)
def stop_focus_session_endpoint(session_id: str, db: Session = Depends(get_db)):
    session = stop_focus_session(db, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Focus session not found or already stopped")
    return session


@router.get("/sessions", response_model=list[FocusSessionRead])
def list_focus_sessions_endpoint(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    return list_focus_sessions(db, limit=limit, offset=offset)
