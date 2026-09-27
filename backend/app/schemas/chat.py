from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ChatRole


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ChatOut(BaseModel):
    reply: str
    sentiment: float
    source: str  # "llm" | "fallback"
    # Which OpenRouter model answered; None for a fallback reply. Additive, so
    # the frontend's closed `source` union stays as it is.
    model: str | None = None


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    role: ChatRole
    content: str
    sentiment: float | None = None
    ts: datetime
