from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud import get_daily_insight, get_daily_summary
from app.database import get_db
from app.models import DailySnapshot
from app.schemas import DailyInsightRead, DailySnapshotRead, DailySnapshotSystemState, DailySummaryRead
from app.services.daily_snapshot import ensure_today_snapshot, generate_daily_snapshot, list_daily_snapshots

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _snapshot_read(row: DailySnapshot) -> DailySnapshotRead:
    return DailySnapshotRead(
        date=row.snapshot_date.isoformat(),
        tasks_completed=row.tasks_completed,
        focus_minutes=row.focus_minutes,
        expenses_total=float(row.expenses_total),
        cleaning_completed=row.cleaning_completed,
        home_health_score=row.home_health_score,
        system_state=DailySnapshotSystemState.model_validate(row.system_state or {}),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/daily-summary", response_model=DailySummaryRead)
def daily_summary_endpoint(
    db: Session = Depends(get_db),
    target_date: date = Query(default_factory=date.today),
):
    return get_daily_summary(db, target_date=target_date)


@router.get("/daily-insight", response_model=DailyInsightRead)
def daily_insight_endpoint(
    db: Session = Depends(get_db),
    target_date: date = Query(default_factory=date.today),
):
    return get_daily_insight(db, target_date=target_date)


@router.get("/daily-snapshot", response_model=DailySnapshotRead)
def daily_snapshot_endpoint(
    db: Session = Depends(get_db),
    target_date: date = Query(default_factory=date.today),
):
    """
    Materialize or refresh a snapshot for the given UTC calendar date from live DB aggregates.
    Listing snapshots separately ensures today's row exists (MVP daily reset without a cron).
    """
    row = generate_daily_snapshot(db, target_date)
    return _snapshot_read(row)


@router.get("/daily-snapshots", response_model=list[DailySnapshotRead])
def daily_snapshots_list_endpoint(
    db: Session = Depends(get_db),
    limit: int = Query(60, ge=1, le=365),
):
    ensure_today_snapshot(db)
    rows = list_daily_snapshots(db, limit=limit)
    return [_snapshot_read(r) for r in rows]
