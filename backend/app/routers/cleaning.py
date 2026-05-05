from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.crud import create_cleaning_zone, list_cleaning_zones, mark_cleaning_done
from app.database import get_db
from app.schemas import CleaningMarkDone, CleaningZoneCreate, CleaningZoneRead

router = APIRouter(prefix="/cleaning", tags=["cleaning"])


@router.post("/zones", response_model=CleaningZoneRead, status_code=201)
def create_cleaning_zone_endpoint(payload: CleaningZoneCreate, db: Session = Depends(get_db)):
    zone = create_cleaning_zone(db, payload)
    return {
        "id": zone.id,
        "name": zone.name,
        "frequency_days": zone.frequency_days,
        "last_cleaned_at": zone.last_cleaned_at,
        "created_at": zone.created_at,
        "status": "overdue",
    }


@router.get("/zones", response_model=list[CleaningZoneRead])
def list_cleaning_zones_endpoint(db: Session = Depends(get_db)):
    return list_cleaning_zones(db)


@router.post("/zones/{zone_id}/done", response_model=CleaningZoneRead)
def mark_cleaning_done_endpoint(zone_id: str, payload: CleaningMarkDone, db: Session = Depends(get_db)):
    zone = mark_cleaning_done(db, zone_id=zone_id, cleaned_at=payload.cleaned_at)
    if zone is None:
        raise HTTPException(status_code=404, detail="Cleaning zone not found")
    return zone
