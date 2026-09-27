from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_db
from app.habits.model import predict_skip_risk
from app.habits.nudges import catch_up_nudge_for_user
from app.models.engagement import HabitLog, Nudge
from app.models.user import User
from app.schemas.habit import HabitLogIn, HabitLogOut, NudgeOut, RiskOut

router = APIRouter(tags=["habits"])


@router.post(
    "/habits/logs", response_model=HabitLogOut, status_code=status.HTTP_201_CREATED
)
def add_habit_log(
    body: HabitLogIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = HabitLog(
        user_id=user.id,
        date=body.date,
        planned=body.planned,
        completed=body.completed,
        time_of_day=body.time_of_day,
        weekday=body.date.weekday(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/habits", response_model=list[HabitLogOut])
def list_habits(
    limit: int = Query(default=60, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = db.scalars(
        select(HabitLog)
        .where(HabitLog.user_id == user.id)
        .order_by(HabitLog.date.desc())
        .limit(limit)
    ).all()
    return logs


@router.get("/habits/risk", response_model=RiskOut)
def habit_risk(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    logs = db.scalars(
        select(HabitLog).where(HabitLog.user_id == user.id)
    ).all()
    prob, factors = predict_skip_risk(logs)
    return RiskOut(skip_probability=prob, factors=factors)


@router.get("/nudges", response_model=list[NudgeOut])
def list_nudges(
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # The habits page loads /habits, /habits/risk and /nudges concurrently, so
    # the catch-up has to run here — hooking only /habits/risk would let this
    # response resolve before the nudge existed.
    catch_up_nudge_for_user(db, user.id)

    nudges = db.scalars(
        select(Nudge)
        .where(Nudge.user_id == user.id)
        .order_by(Nudge.sent_at.desc())
        .limit(limit)
    ).all()
    return nudges


@router.post("/nudges/{nudge_id}/dismiss", response_model=NudgeOut)
def dismiss_nudge(
    nudge_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    nudge = db.get(Nudge, nudge_id)
    if nudge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nudge not found")
    if nudge.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your nudge")
    nudge.dismissed = True
    db.commit()
    db.refresh(nudge)
    return nudge
