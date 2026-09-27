from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_db
from app.diet.router import _profile_complete
from app.habits.model import predict_skip_risk
from app.habits.nudges import ensure_daily_nudge
from app.models.diet import DietPlan, NutritionLog
from app.models.engagement import HabitLog, Nudge
from app.models.user import User
from app.models.workout import PerformanceScore
from app.schemas.dashboard import DashboardSummary
from app.timeutil import utc_today

router = APIRouter(tags=["dashboard"])


def _streak(logs: list[HabitLog], today: date) -> int:
    """Consecutive completed days ending today (or yesterday if today isn't logged)."""
    completed = {log.date for log in logs if log.completed}
    cursor = today
    if cursor not in completed:
        cursor = today - timedelta(days=1)
    count = 0
    while cursor in completed:
        count += 1
        cursor -= timedelta(days=1)
    return count


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """One headline metric per module for the dashboard home cards."""
    today = utc_today()

    latest_score = db.scalars(
        select(PerformanceScore.score)
        .where(PerformanceScore.user_id == user.id)
        .order_by(PerformanceScore.ts.desc())
        .limit(1)
    ).first()

    consumed = db.scalar(
        select(func.coalesce(func.sum(NutritionLog.kcal), 0.0)).where(
            NutritionLog.user_id == user.id, NutritionLog.date == today
        )
    )

    target = db.scalars(
        select(DietPlan.target_kcal)
        .where(DietPlan.user_id == user.id)
        .order_by(DietPlan.created_at.desc())
        .limit(1)
    ).first()

    logs = db.scalars(select(HabitLog).where(HabitLog.user_id == user.id)).all()
    skip_prob, factors = predict_skip_risk(list(logs))

    # Visit-triggered daily catch-up, reusing the score already computed above.
    # Runs before the count below so a nudge created now is reflected in it.
    ensure_daily_nudge(db, user.id, skip_prob, factors, today=today)

    active_nudges = db.scalar(
        select(func.count(Nudge.id)).where(
            Nudge.user_id == user.id, Nudge.dismissed.is_(False)
        )
    )

    return DashboardSummary(
        profile_complete=_profile_complete(user.profile),
        latest_score=round(latest_score, 1) if latest_score is not None else None,
        # float() because PostgreSQL's sum() returns Decimal, SQLite a float.
        nutrition_consumed_kcal=round(float(consumed or 0.0), 1),
        nutrition_target_kcal=target,
        skip_probability=skip_prob,
        streak=_streak(list(logs), today),
        active_nudges=active_nudges or 0,
    )
