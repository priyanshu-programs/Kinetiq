"""Visit-triggered daily nudge catch-up and its database-level idempotency."""

from datetime import timedelta

import pytest

from app.config import settings
from app.habits.nudges import catch_up_nudge_for_user, ensure_daily_nudge
from app.models.engagement import HabitLog, Nudge
from app.timeutil import utc_today


@pytest.fixture
def at_risk(db, user):
    """A user whose recent history is all skipped, so risk is high."""
    today = utc_today()
    for i in range(10):
        day = today - timedelta(days=i + 1)
        db.add(
            HabitLog(
                user_id=user.id,
                date=day,
                planned=True,
                completed=False,
                time_of_day=22,
                weekday=day.weekday(),
            )
        )
    db.commit()
    return user


def _nudges(db, user):
    return db.query(Nudge).filter(Nudge.user_id == user.id).all()


def test_below_threshold_creates_nothing(db, user, monkeypatch):
    monkeypatch.setattr(settings, "nudge_risk_threshold", 0.99)
    assert ensure_daily_nudge(db, user.id, 0.5, ["x"]) is None
    assert _nudges(db, user) == []


def test_repeat_visits_create_one_nudge(client, auth_headers, at_risk, db, monkeypatch):
    monkeypatch.setattr(settings, "nudge_risk_threshold", 0.3)

    first = client.get("/dashboard/summary", headers=auth_headers).json()
    second = client.get("/dashboard/summary", headers=auth_headers).json()

    assert first["active_nudges"] == 1
    assert second["active_nudges"] == 1
    assert len(_nudges(db, at_risk)) == 1


def test_dismissal_does_not_reopen_the_day(client, auth_headers, at_risk, db, monkeypatch):
    """The regression this design exists for: dismissing used to let the next
    visit create a second nudge for the same day."""
    monkeypatch.setattr(settings, "nudge_risk_threshold", 0.3)

    client.get("/dashboard/summary", headers=auth_headers)
    nudge_id = _nudges(db, at_risk)[0].id
    assert client.post(f"/nudges/{nudge_id}/dismiss", headers=auth_headers).status_code == 200

    client.get("/dashboard/summary", headers=auth_headers)
    client.get("/nudges", headers=auth_headers)

    rows = _nudges(db, at_risk)
    assert len(rows) == 1
    assert rows[0].dismissed is True


def test_new_day_gets_its_own_nudge(db, at_risk, monkeypatch):
    monkeypatch.setattr(settings, "nudge_risk_threshold", 0.3)
    today = utc_today()

    assert catch_up_nudge_for_user(db, at_risk.id, today=today - timedelta(days=1)) is not None
    assert catch_up_nudge_for_user(db, at_risk.id, today=today) is not None
    assert len(_nudges(db, at_risk)) == 2


def test_second_call_same_day_is_a_no_op(db, at_risk, monkeypatch):
    """Survives a restart: the guard is the unique constraint, not process state."""
    monkeypatch.setattr(settings, "nudge_risk_threshold", 0.3)
    assert catch_up_nudge_for_user(db, at_risk.id) is not None
    assert catch_up_nudge_for_user(db, at_risk.id) is None
    assert len(_nudges(db, at_risk)) == 1


def test_nudges_endpoint_creates_todays_nudge(client, auth_headers, at_risk, db, monkeypatch):
    """The habits page races /nudges against /habits/risk, so this endpoint
    has to do the catch-up itself."""
    monkeypatch.setattr(settings, "nudge_risk_threshold", 0.3)

    body = client.get("/nudges", headers=auth_headers).json()
    assert len(body) == 1
    assert len(_nudges(db, at_risk)) == 1


def test_unique_constraint_is_enforced_by_the_database(db, user):
    today = utc_today()
    db.add(Nudge(user_id=user.id, message="a", nudge_date=today))
    db.commit()
    db.add(Nudge(user_id=user.id, message="b", nudge_date=today))
    with pytest.raises(Exception):
        db.commit()
    db.rollback()
