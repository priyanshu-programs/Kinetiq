"""Dashboard summary aggregation: empty state + populated metrics."""

from datetime import timedelta

from app.config import settings
from app.models.diet import DietPlan, NutritionLog
from app.models.engagement import HabitLog, Nudge
from app.models.workout import PerformanceScore, WorkoutSession
from app.models.enums import Exercise
from app.timeutil import utc_today


def test_summary_empty_state(client, auth_headers, monkeypatch):
    # Pinned so active_nudges == 0 means "the catch-up ran and declined", not
    # luck: a cold-start user scores 0.574 on weekends against a 0.6 default.
    monkeypatch.setattr(settings, "nudge_risk_threshold", 0.99)

    r = client.get("/dashboard/summary", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["profile_complete"] is False
    assert body["latest_score"] is None
    assert body["nutrition_consumed_kcal"] == 0.0
    assert body["nutrition_target_kcal"] is None
    assert body["active_nudges"] == 0
    assert body["streak"] == 0
    assert 0.0 <= body["skip_probability"] <= 1.0


def test_summary_requires_auth(client):
    assert client.get("/dashboard/summary").status_code == 401


def test_summary_aggregates_each_module(client, auth_headers, db, user, monkeypatch):
    monkeypatch.setattr(settings, "nudge_risk_threshold", 0.99)

    session = WorkoutSession(user_id=user.id, exercise=Exercise.squat, total_reps=10)
    db.add(session)
    db.flush()
    db.add(PerformanceScore(user_id=user.id, session_id=session.id, score=82.4))
    db.add(DietPlan(user_id=user.id, target_kcal=2000.0))
    today = utc_today()
    db.add(NutritionLog(user_id=user.id, date=today, food="lunch", kcal=650.0))
    db.add(NutritionLog(user_id=user.id, date=today, food="snack", kcal=200.0))
    db.add(HabitLog(user_id=user.id, date=today, planned=True, completed=True))
    db.add(Nudge(user_id=user.id, message="move!", reason="risk", dismissed=False))
    # Yesterday's: one nudge per user per day is enforced by uq_nudge_user_date.
    db.add(
        Nudge(
            user_id=user.id,
            message="old",
            reason="risk",
            dismissed=True,
            nudge_date=today - timedelta(days=1),
        )
    )
    db.commit()

    body = client.get("/dashboard/summary", headers=auth_headers).json()
    assert body["latest_score"] == 82.4
    assert body["nutrition_consumed_kcal"] == 850.0
    assert body["nutrition_target_kcal"] == 2000.0
    assert body["streak"] == 1
    assert body["active_nudges"] == 1
