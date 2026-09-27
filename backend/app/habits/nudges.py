"""Daily nudge catch-up: flag a high skip-risk user with an actionable Nudge.

Triggered by the user's own visits rather than a background scheduler. The free
host sleeps after a few idle minutes, so an interval job measured from process
start realistically never fires; a visit-triggered check needs no uptime.

Idempotency is enforced by the database (``uq_nudge_user_date``), not by a
Python scan, so a repeat visit, a concurrent request, or a process restart
cannot produce a second nudge for the same day. The check deliberately ignores
``dismissed``: dismissing today's nudge must not re-open the window.

Scope: this creates *today's* nudge on the first qualifying visit of the day.
It does not backfill one row per missed day, and it does not deliver
notifications while the user is away — that remains backlog.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal
from app.habits.model import predict_skip_risk
from app.models.engagement import HabitLog, Nudge
from app.models.user import User
from app.timeutil import utc_now, utc_today

_MESSAGE = (
    "You're at risk of skipping today — a quick 10-minute "
    "session keeps your streak alive!"
)


def ensure_daily_nudge(
    db: Session,
    user_id: int,
    skip_probability: float,
    factors: list[str],
    *,
    today: date | None = None,
) -> Nudge | None:
    """Create today's nudge if the user is at risk and none exists yet.

    Must be called before the caller reads or writes anything else in the
    request: the IntegrityError branch rolls back, and that rollback would
    otherwise discard the caller's pending work.
    """
    if skip_probability <= settings.nudge_risk_threshold:
        return None

    today = today or utc_today()
    existing = db.scalar(
        select(Nudge.id).where(Nudge.user_id == user_id, Nudge.nudge_date == today)
    )
    if existing is not None:
        return None

    nudge = Nudge(
        user_id=user_id,
        message=_MESSAGE,
        reason="; ".join(factors),
        nudge_date=today,
        sent_at=utc_now(),
    )
    db.add(nudge)
    try:
        db.commit()
    except IntegrityError:
        # A concurrent request created today's nudge first.
        db.rollback()
        return None
    return nudge


def catch_up_nudge_for_user(
    db: Session, user_id: int, *, today: date | None = None
) -> Nudge | None:
    """Compute risk and delegate. For callers that don't already have a score."""
    logs = db.scalars(select(HabitLog).where(HabitLog.user_id == user_id)).all()
    prob, factors = predict_skip_risk(list(logs))
    return ensure_daily_nudge(db, user_id, prob, factors, today=today)


def run_nudge_job(db: Session | None = None) -> int:
    """Sweep every user. Kept for tests and for an external scheduler."""
    owns_session = db is None
    db = db or SessionLocal()
    created = 0
    try:
        for user_id in db.scalars(select(User.id)).all():
            if catch_up_nudge_for_user(db, user_id) is not None:
                created += 1
        return created
    finally:
        if owns_session:
            db.close()
