from pydantic import BaseModel


class RecommendationOut(BaseModel):
    gym_id: str | None = None
    name: str
    distance_km: float | None = None
    match_score: float
    reason: str | None = None
    free: bool = False
