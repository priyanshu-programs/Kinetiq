from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_db
from app.models.reco import GymRecommendation
from app.models.user import User
from app.reco import service
from app.schemas.reco import RecommendationOut

router = APIRouter(tags=["reco"])


@router.get("/recommendations", response_model=list[RecommendationOut])
def recommendations(
    city: str | None = Query(default=None, max_length=120),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = service.recommend(user.profile, city)

    # Persist the top match as a lightweight history record.
    if results:
        top = results[0]
        db.add(
            GymRecommendation(
                user_id=user.id,
                gym_id=top["gym_id"],
                name=top["name"],
                distance_km=top["distance_km"],
                match_score=top["match_score"],
                reason=top["reason"],
            )
        )
        db.commit()

    return results
