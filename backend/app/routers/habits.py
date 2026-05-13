from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DetectedHabitRead
from app.services.habits import run_habit_detection_engine

router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("/detected", response_model=list[DetectedHabitRead])
def list_detected_habits(
    days: int = Query(45, ge=7, le=120, description="Lookback window in days for event mining."),
    db: Session = Depends(get_db),
):
    raw = run_habit_detection_engine(db, lookback_days=days)
    return [DetectedHabitRead.model_validate(h) for h in raw]
