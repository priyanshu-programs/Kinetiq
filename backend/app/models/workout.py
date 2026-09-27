from datetime import datetime

from sqlalchemy import Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import Exercise
from app.models.types import JSONColumn, TZDateTime, enum_column


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    exercise: Mapped[Exercise] = mapped_column(enum_column(Exercise), nullable=False)
    started_at: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(TZDateTime)
    total_reps: Mapped[int] = mapped_column(Integer, default=0)
    avg_form_score: Mapped[float | None] = mapped_column(Float)


class RepEvent(Base):
    __tablename__ = "rep_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("workout_sessions.id"), index=True, nullable=False
    )
    rep_index: Mapped[int] = mapped_column(Integer, nullable=False)
    form_score: Mapped[float] = mapped_column(Float, default=0.0)
    tempo_ms: Mapped[int | None] = mapped_column(Integer)
    flags: Mapped[dict | None] = mapped_column(JSONColumn)
    ts: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())


class PerformanceScore(Base):
    __tablename__ = "performance_scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    session_id: Mapped[int] = mapped_column(ForeignKey("workout_sessions.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    efficiency: Mapped[float | None] = mapped_column(Float)
    consistency: Mapped[float | None] = mapped_column(Float)
    week: Mapped[int | None] = mapped_column(Integer)
    ts: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())
