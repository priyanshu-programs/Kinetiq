from pydantic import BaseModel


class DashboardSummary(BaseModel):
    profile_complete: bool
    latest_score: float | None = None
    nutrition_consumed_kcal: float = 0.0
    nutrition_target_kcal: float | None = None
    skip_probability: float = 0.0
    streak: int = 0
    active_nudges: int = 0
