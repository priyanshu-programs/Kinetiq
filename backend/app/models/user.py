from datetime import datetime

from sqlalchemy import Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.enums import ActivityLevel, DietPref, Goal, Role, Sex
from app.models.types import TZDateTime, enum_column


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(enum_column(Role), default=Role.user, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())

    profile: Mapped["Profile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, index=True, nullable=False
    )
    age: Mapped[int | None] = mapped_column(Integer)
    sex: Mapped[Sex | None] = mapped_column(enum_column(Sex))
    height_cm: Mapped[float | None] = mapped_column(Float)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    goal: Mapped[Goal | None] = mapped_column(enum_column(Goal))
    activity_level: Mapped[ActivityLevel | None] = mapped_column(enum_column(ActivityLevel))
    diet_pref: Mapped[DietPref | None] = mapped_column(enum_column(DietPref))
    updated_at: Mapped[datetime] = mapped_column(
        TZDateTime, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="profile")

    @property
    def bmi(self) -> float | None:
        if self.height_cm and self.weight_kg:
            h = self.height_cm / 100
            return round(self.weight_kg / (h * h), 1)
        return None
