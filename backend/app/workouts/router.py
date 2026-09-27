from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_db
from app.models.user import User
from app.models.workout import PerformanceScore, RepEvent, WorkoutSession
from app.performance.service import compute_score
from app.ratelimit import limiter
from app.schemas.workout import (
    PerformanceScoreOut,
    WorkoutFinishRequest,
    WorkoutFinishResponse,
    WorkoutSessionOut,
    WorkoutStartRequest,
    WorkoutStartResponse,
)

router = APIRouter(tags=["workouts"])


@router.post(
    "/workouts/sessions",
    response_model=WorkoutStartResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_session(
    body: WorkoutStartRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = WorkoutSession(user_id=user.id, exercise=body.exercise)
    db.add(session)
    db.commit()
    db.refresh(session)
    return WorkoutStartResponse(session_id=session.id, started_at=session.started_at)


@router.post(
    "/workouts/sessions/{session_id}/finish",
    response_model=WorkoutFinishResponse,
)
@limiter.limit("30/minute")
def finish_session(
    request: Request,
    session_id: int,
    body: WorkoutFinishRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(WorkoutSession, session_id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your session")

    form_scores = [e.form_score for e in body.rep_events]

    session.ended_at = datetime.now(timezone.utc)
    session.total_reps = body.total_reps
    session.avg_form_score = (
        round(sum(form_scores) / len(form_scores), 2) if form_scores else None
    )

    for event in body.rep_events:
        db.add(
            RepEvent(
                session_id=session.id,
                rep_index=event.rep_index,
                form_score=event.form_score,
                tempo_ms=event.tempo_ms,
                flags=event.flags,
            )
        )

    score, efficiency, consistency = compute_score(
        form_scores, body.total_reps, session.exercise
    )
    perf = PerformanceScore(
        user_id=user.id,
        session_id=session.id,
        score=score,
        efficiency=efficiency,
        consistency=consistency,
        week=session.started_at.isocalendar().week,
    )
    db.add(perf)
    db.commit()
    db.refresh(session)
    db.refresh(perf)

    return WorkoutFinishResponse(
        session=WorkoutSessionOut.model_validate(session),
        performance_score=PerformanceScoreOut.model_validate(perf),
    )


@router.get("/workouts/sessions", response_model=list[WorkoutSessionOut])
def list_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = db.scalars(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id)
        .order_by(WorkoutSession.started_at.desc())
        .limit(limit)
    ).all()
    return sessions
