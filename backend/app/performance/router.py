from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_db
from app.models.user import User
from app.models.workout import PerformanceScore
from app.schemas.workout import WeeklyPerformanceOut

router = APIRouter(tags=["performance"])


@router.get("/performance/weekly", response_model=list[WeeklyPerformanceOut])
def weekly_performance(
    limit: int = Query(default=26, ge=1, le=104),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Average score/efficiency/consistency per ISO week, chronological.

    Returns at most the `limit` most recent weeks."""
    rows = db.scalars(
        select(PerformanceScore)
        .where(PerformanceScore.user_id == user.id)
        .order_by(PerformanceScore.ts)
    ).all()

    buckets: dict[int, list[PerformanceScore]] = {}
    for row in rows:
        week = row.week if row.week is not None else row.ts.isocalendar().week
        buckets.setdefault(week, []).append(row)

    def avg(values: list[float]) -> float:
        return round(sum(values) / len(values), 2) if values else 0.0

    weekly = [
        WeeklyPerformanceOut(
            week=week,
            score=avg([r.score for r in items]),
            efficiency=avg([r.efficiency or 0.0 for r in items]),
            consistency=avg([r.consistency or 0.0 for r in items]),
        )
        for week, items in sorted(buckets.items())
    ]
    return weekly[-limit:]
