"""Sensor-reading retention: prune by age, leave everything else alone."""

from datetime import timedelta

from app.chat import budget
from app.config import settings
from app.iot import retention
from app.models.enums import DeviceType, SensorMetric
from app.models.iot import Device, SensorReading
from app.models.user import Profile
from app.timeutil import utc_now


def _device(db, user):
    d = Device(user_id=user.id, name="Band", type=DeviceType.smartband)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def _reading(db, device, age_days):
    db.add(
        SensorReading(
            device_id=device.id,
            metric=SensorMetric.heart_rate,
            value=120.0,
            ts=utc_now() - timedelta(days=age_days),
        )
    )


def test_prunes_only_readings_past_the_window(db, user):
    device = _device(db, user)
    _reading(db, device, age_days=10)  # stale
    _reading(db, device, age_days=8)  # stale
    _reading(db, device, age_days=1)  # fresh
    db.commit()

    deleted = retention.prune_sensor_readings(db, retention_days=7)

    assert deleted == 2
    assert db.query(SensorReading).count() == 1


def test_prune_leaves_permanent_records_untouched(db, user):
    db.add(Profile(user_id=user.id, age=30, height_cm=175.0, weight_kg=70.0))
    device = _device(db, user)
    _reading(db, device, age_days=30)
    db.commit()

    retention.prune_sensor_readings(db, retention_days=7)

    assert db.query(SensorReading).count() == 0
    assert db.query(Profile).count() == 1
    assert db.query(Device).count() == 1


def test_batch_limit_bounds_one_pass(db, user):
    device = _device(db, user)
    for _ in range(5):
        _reading(db, device, age_days=20)
    db.commit()

    assert retention.prune_sensor_readings(db, retention_days=7, batch_limit=2) == 2
    assert db.query(SensorReading).count() == 3


def test_maybe_prune_is_interval_guarded(db, user):
    device = _device(db, user)
    _reading(db, device, age_days=20)
    db.commit()
    retention.reset_interval()

    assert retention.maybe_prune(db) == 1

    _reading(db, device, age_days=20)
    db.commit()
    # Second call inside the hour does nothing.
    assert retention.maybe_prune(db) == 0
    assert db.query(SensorReading).count() == 1


def test_retention_days_comes_from_settings(db, user, monkeypatch):
    monkeypatch.setattr(settings, "sensor_retention_days", 1)
    device = _device(db, user)
    _reading(db, device, age_days=2)
    db.commit()

    assert retention.prune_sensor_readings(db) == 1


# --- shared-account LLM budget ------------------------------------------------


def test_budget_allows_up_to_the_limit_then_refuses(db):
    assert budget.try_reserve(db, budget=2) is True
    assert budget.try_reserve(db, budget=2) is True
    assert budget.try_reserve(db, budget=2) is False
    assert budget.used_today(db) == 2


def test_budget_of_zero_refuses_immediately(db):
    assert budget.try_reserve(db, budget=0) is False
    assert budget.used_today(db) == 0


def test_budget_is_per_day(db):
    from datetime import timedelta as td

    from app.timeutil import utc_today

    today = utc_today()
    assert budget.try_reserve(db, budget=1, day=today - td(days=1)) is True
    # Yesterday being spent must not affect today.
    assert budget.try_reserve(db, budget=1, day=today) is True
