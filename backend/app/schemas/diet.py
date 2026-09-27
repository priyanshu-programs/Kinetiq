from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class DietPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    bmi: float | None = None
    tdee: float | None = None
    target_kcal: float | None = None
    macros: dict | None = None
    meals: list[dict] | None = None
    grocery: list[str] | None = None
    created_at: datetime


class NutritionLogIn(BaseModel):
    date: date
    food: str = Field(min_length=1, max_length=200)
    kcal: float | None = Field(default=None, ge=0)
    protein: float | None = Field(default=None, ge=0)
    carbs: float | None = Field(default=None, ge=0)
    fat: float | None = Field(default=None, ge=0)


class NutritionLogOut(NutritionLogIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
