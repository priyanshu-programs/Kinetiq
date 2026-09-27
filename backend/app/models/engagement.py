from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    Float,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.enums import ChatRole
from app.models.types import TZDateTime, enum_column
from app.timeutil import utc_today


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[ChatRole] = mapped_column(enum_column(ChatRole), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment: Mapped[float | None] = mapped_column(Float)
    ts: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())

    __table_args__ = (Index("ix_chat_user_ts", "user_id", "ts"),)


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    planned: Mapped[bool] = mapped_column(Boolean, default=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    time_of_day: Mapped[int | None] = mapped_column(Integer)
    weekday: Mapped[int | None] = mapped_column(Integer)

    __table_args__ = (Index("ix_habit_user_date", "user_id", "date"),)


class Nudge(Base):
    __tablename__ = "nudges"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    # The UTC day this nudge covers. Enforced unique per user so a restart, a
    # repeat visit, or a dismissal cannot produce a second nudge for one day.
    nudge_date: Mapped[date] = mapped_column(Date, nullable=False, default=utc_today)
    sent_at: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())
    dismissed: Mapped[bool] = mapped_column(Boolean, default=False)

    __table_args__ = (UniqueConstraint("user_id", "nudge_date", name="uq_nudge_user_date"),)
