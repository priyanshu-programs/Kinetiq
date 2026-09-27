"""Habit module: skip-risk model bounds + nudge job + endpoints."""

from datetime import date, timedelta

from app.config import settings
from app.habits.model import predict_skip_risk
from app.habits.nudges import run_nudge_job
from app.models.engagement import HabitLog, Nudge
from app.timeutil import utc_today


def test_risk_in_bounds_cold_start():
    prob, factors = predict_skip_risk([], today_weekday=2)
    assert 0.0 <= prob <= 1.0
    assert factors  # always explains itself


def test_skipping_user_is_riskier_than_consistent_user():
    skipper = [
        HabitLog(date=date(2026, 6, d), planned=True, completed=False, time_of_day=22)
        for d in range(1, 11)
    ]
    consistent = [
        HabitLog(date=date(2026, 6, d), planned=True, completed=True, time_of_day=7)
        for d in range(1, 11)
    ]
    skip_prob, _ = predict_skip_risk(skipper, today_weekday=2)
    keep_prob, _ = predict_skip_risk(consistent, today_weekday=2)
    assert skip_prob > keep_prob


def test_nudge_job_creates_nudge_for_high_risk_user(db, user, monkeypatch):
    monkeypatch.setattr(settings, "nudge_risk_threshold", 0.3)
    # All-skipped recent history → high risk on any weekday.
    today = utc_today()
    for i in range(10):
        db.add(
            HabitLog(
                user_id=user.id,
                date=today - timedelta(days=i + 1),
                planned=True,
                completed=False,
                time_of_day=22,
                weekday=(today - timedelta(days=i + 1)).weekday(),
            )
        )
    db.commit()

    created = run_nudge_job(db=db)
    assert created == 1
    nudges = db.query(Nudge).filter(Nudge.user_id == user.id).all()
    assert len(nudges) == 1

    # Idempotent for the same day — no duplicate nudge.
    assert run_nudge_job(db=db) == 0


def test_log_risk_and_dismiss_endpoints(client, auth_headers):
    r = client.post(
        "/habits/logs",
        headers=auth_headers,
        json={"date": "2026-06-15", "planned": True, "completed": True, "time_of_day": 7},
    )
    assert r.status_code == 201
    assert r.json()["weekday"] == date(2026, 6, 15).weekday()

    risk = client.get("/habits/risk", headers=auth_headers)
    assert risk.status_code == 200
    assert 0.0 <= risk.json()["skip_probability"] <= 1.0


def test_dismiss_nudge(client, auth_headers, db, user):
    db.add(Nudge(user_id=user.id, message="test", reason="r"))
    db.commit()
    nudge_id = db.query(Nudge).first().id

    r = client.post(f"/nudges/{nudge_id}/dismiss", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["dismissed"] is True
