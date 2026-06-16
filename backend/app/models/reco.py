from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class GymRecommendation(Base):
    __tablename__ = "gym_recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    gym_id: Mapped[str | None] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    distance_km: Mapped[float | None] = mapped_column(Float)
    match_score: Mapped[float | None] = mapped_column(Float)
    reason: Mapped[str | None] = mapped_column(Text)
    ts: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
