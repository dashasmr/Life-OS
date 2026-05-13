from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud import create_recommendation_feedback
from app.database import get_db
from app.schemas import AdaptiveContextRead, RecommendationFeedbackCreate, RecommendationFeedbackRead
from app.services.adaptive.profile import build_adaptive_context

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/feedback", response_model=RecommendationFeedbackRead)
def post_recommendation_feedback(body: RecommendationFeedbackCreate, db: Session = Depends(get_db)):
    row = create_recommendation_feedback(
        db,
        recommendation_id=body.recommendation_id,
        outcome=body.outcome,
        local_hour=body.local_hour,
    )
    return row


@router.get("/adaptive-context", response_model=AdaptiveContextRead)
def get_adaptive_context(db: Session = Depends(get_db)):
    return build_adaptive_context(db)
