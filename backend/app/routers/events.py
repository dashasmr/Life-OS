from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud import create_event, list_events
from app.database import get_db
from app.schemas import EventCreate, EventRead

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=EventRead, status_code=201)
def create_event_endpoint(payload: EventCreate, db: Session = Depends(get_db)):
    return create_event(db, payload)


@router.get("", response_model=list[EventRead])
def list_events_endpoint(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
    event_type: str | None = Query(None),
):
    return list_events(db, limit=limit, offset=offset, event_type=event_type)
