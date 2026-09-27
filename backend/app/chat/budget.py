"""Daily OpenRouter call budget for the shared account.

OpenRouter's free allowance is per *account*, not per user, so the per-IP
slowapi limit on ``POST /chat`` does not bound it. The counter lives in the
database because the free host sleeps when idle, which would reset an
in-process counter several times a day.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models.llm import LlmUsage
from app.timeutil import utc_today


def _claim(db: Session, day: date, budget: int) -> bool:
    """One atomic increment, only if today's count is still under budget."""
    result = db.execute(
        update(LlmUsage)
        .where(LlmUsage.day == day, LlmUsage.count < budget)
        .values(count=LlmUsage.count + 1)
    )
    return bool(result.rowcount)


def try_reserve(db: Session, *, budget: int | None = None, day: date | None = None) -> bool:
    """Claim one call from today's budget. False means fall back to a basic reply."""
    day = day or utc_today()
    budget = settings.openrouter_daily_budget if budget is None else budget
    if budget <= 0:
        return False

    if _claim(db, day, budget):
        db.commit()
        return True

    # No row for today yet, or the budget is spent. Distinguish the two.
    if db.scalar(select(LlmUsage.count).where(LlmUsage.day == day)) is not None:
        return False  # spent

    db.add(LlmUsage(day=day, count=1))
    try:
        db.commit()
        return True
    except IntegrityError:
        # A concurrent request created today's row first; retry the increment.
        db.rollback()
        claimed = _claim(db, day, budget)
        db.commit()
        return claimed


def used_today(db: Session, *, day: date | None = None) -> int:
    return db.scalar(select(LlmUsage.count).where(LlmUsage.day == (day or utc_today()))) or 0
