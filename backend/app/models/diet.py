from datetime import date, datetime

from sqlalchemy import Date, Float, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.types import JSONColumn, TZDateTime


class DietPlan(Base):
    __tablename__ = "diet_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    bmi: Mapped[float | None] = mapped_column(Float)
    tdee: Mapped[float | None] = mapped_column(Float)
    target_kcal: Mapped[float | None] = mapped_column(Float)
    macros: Mapped[dict | None] = mapped_column(JSONColumn)
    meals: Mapped[list | None] = mapped_column(JSONColumn)
    grocery: Mapped[list | None] = mapped_column(JSONColumn)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())


class NutritionLog(Base):
    __tablename__ = "nutrition_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    food: Mapped[str] = mapped_column(Text, nullable=False)
    kcal: Mapped[float | None] = mapped_column(Float)
    protein: Mapped[float | None] = mapped_column(Float)
    carbs: Mapped[float | None] = mapped_column(Float)
    fat: Mapped[float | None] = mapped_column(Float)

    __table_args__ = (Index("ix_nutrition_user_date", "user_id", "date"),)
