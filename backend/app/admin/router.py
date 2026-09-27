from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.security import require_role
from app.db import get_db
from app.models.engagement import ChatMessage, HabitLog
from app.models.enums import Role
from app.models.user import User
from app.models.workout import PerformanceScore, WorkoutSession
from app.schemas.admin import AdminAnalytics

router = APIRouter(tags=["admin"])


@router.get("/admin/analytics", response_model=AdminAnalytics)
def admin_analytics(
    _: User = Depends(require_role(Role.admin)),
    db: Session = Depends(get_db),
):
    """App-wide aggregate stats. Role-gated to admins (403 otherwise)."""
    total_users = db.scalar(select(func.count(User.id))) or 0
    total_sessions = db.scalar(select(func.count(WorkoutSession.id))) or 0
    avg_score = db.scalar(select(func.avg(PerformanceScore.score)))
    total_chat = db.scalar(select(func.count(ChatMessage.id))) or 0
    total_habits = db.scalar(select(func.count(HabitLog.id))) or 0

    rows = db.execute(
        select(WorkoutSession.exercise, func.count(WorkoutSession.id)).group_by(
            WorkoutSession.exercise
        )
    ).all()
    sessions_by_exercise = {exercise.value: count for exercise, count in rows}

    return AdminAnalytics(
        total_users=total_users,
        total_sessions=total_sessions,
        # float() because PostgreSQL's avg() returns Decimal, SQLite a float.
        avg_performance_score=round(float(avg_score), 1) if avg_score is not None else None,
        total_chat_messages=total_chat,
        total_habit_logs=total_habits,
        sessions_by_exercise=sessions_by_exercise,
    )
