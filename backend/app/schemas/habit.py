from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class HabitLogIn(BaseModel):
    date: date
    planned: bool = True
    completed: bool = False
    time_of_day: int | None = Field(default=None, ge=0, le=23)


class HabitLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date: date
    planned: bool
    completed: bool
    time_of_day: int | None = None
    weekday: int | None = None


class RiskOut(BaseModel):
    skip_probability: float
    factors: list[str]


class NudgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    message: str
    reason: str | None = None
    sent_at: datetime
    dismissed: bool
