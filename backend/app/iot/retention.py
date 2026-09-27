"""Retention for simulated raw sensor readings.

Called from request and simulator paths rather than a background schedule, so
pruning never depends on the process staying up — the free host sleeps when
idle. Takes an injected ``Session`` so it is testable, mirroring
``run_nudge_job``.
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta

from loguru import logger
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.iot import SensorReading
from app.timeutil import utc_now

# Don't re-scan on every tick or request.
_MIN_INTERVAL_SECONDS = 3600.0
_last_run_at: float | None = None


def prune_sensor_readings(
    db: Session,
    *,
    retention_days: int | None = None,
    now: datetime | None = None,
    batch_limit: int = 5000,
) -> int:
    """Delete readings older than the retention window. Returns rows deleted.

    Only touches ``sensor_readings`` — profiles, workouts, and every other
    permanent record are untouched.
    """
    days = settings.sensor_retention_days if retention_days is None else retention_days
    cutoff = (now or utc_now()) - timedelta(days=days)

    # Bounded by id so the delete uses ix_sensor_ts for the scan and the
    # primary key for the delete, keeping lock duration short.
    victims = select(SensorReading.id).where(SensorReading.ts < cutoff).limit(batch_limit)
    deleted = db.execute(
        delete(SensorReading).where(SensorReading.id.in_(victims.scalar_subquery()))
    ).rowcount
    db.commit()
    if deleted:
        logger.info("Pruned {} sensor readings older than {}", deleted, cutoff.isoformat())
    return deleted


def maybe_prune(db: Session, *, force: bool = False) -> int:
    """Hourly-guarded wrapper, safe to call from hot paths."""
    global _last_run_at
    now = time.monotonic()
    if not force and _last_run_at is not None and now - _last_run_at < _MIN_INTERVAL_SECONDS:
        return 0
    _last_run_at = now
    return prune_sensor_readings(db)


def reset_interval() -> None:
    """Clear the hourly guard. For tests."""
    global _last_run_at
    _last_run_at = None
