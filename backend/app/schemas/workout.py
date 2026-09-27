from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Exercise


class WorkoutStartRequest(BaseModel):
    exercise: Exercise


class WorkoutStartResponse(BaseModel):
    session_id: int
    started_at: datetime


class RepEventIn(BaseModel):
    rep_index: int = Field(ge=0)
    form_score: float = Field(ge=0, le=100)
    tempo_ms: int | None = Field(default=None, ge=0)
    flags: dict | None = None


class WorkoutFinishRequest(BaseModel):
    total_reps: int = Field(ge=0)
    rep_events: list[RepEventIn] = Field(default_factory=list)


class WorkoutSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exercise: Exercise
    started_at: datetime
    ended_at: datetime | None = None
    total_reps: int
    avg_form_score: float | None = None


class PerformanceScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    score: float
    efficiency: float | None = None
    consistency: float | None = None
    week: int | None = None
    ts: datetime


class WorkoutFinishResponse(BaseModel):
    session: WorkoutSessionOut
    performance_score: PerformanceScoreOut


class WeeklyPerformanceOut(BaseModel):
    week: int
    score: float
    efficiency: float
    consistency: float
