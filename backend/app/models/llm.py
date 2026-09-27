from datetime import date

from sqlalchemy import Date, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class LlmUsage(Base):
    """One row per UTC day, counting OpenRouter calls for the whole account.

    Stored rather than counted in memory because the free host sleeps after
    idle, which would reset an in-process counter several times a day and
    leave the shared account's daily quota effectively unguarded.
    """

    __tablename__ = "llm_usage"

    day: Mapped[date] = mapped_column(Date, primary_key=True)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
