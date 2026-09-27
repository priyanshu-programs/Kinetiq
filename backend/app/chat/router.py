from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.chat import budget, llm, sentiment
from app.db import get_db
from app.models.engagement import ChatMessage
from app.models.enums import ChatRole
from app.models.user import User
from app.ratelimit import limiter
from app.schemas.chat import ChatIn, ChatMessageOut, ChatOut

router = APIRouter(tags=["chat"])

# Recent turns sent to the model for follow-up context (user + assistant pairs).
_CONTEXT_MESSAGES = 8


@router.post("/chat", response_model=ChatOut)
@limiter.limit("20/minute")
def chat(
    request: Request,
    body: ChatIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    compound = sentiment.score(body.message)
    tone = sentiment.tone_of(compound)

    recent = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.ts.desc(), ChatMessage.id.desc())
        .limit(_CONTEXT_MESSAGES)
    ).all()
    history = [{"role": m.role.value, "content": m.content} for m in reversed(recent)]

    # Claim from the shared account's daily budget before touching the network.
    if llm.llm_enabled() and budget.try_reserve(db):
        reply, source, model = llm.generate_reply(body.message, user.profile, tone, history)
    else:
        reply, source, model = llm.fallback_reply(body.message, tone), "fallback", None

    db.add(
        ChatMessage(
            user_id=user.id,
            role=ChatRole.user,
            content=body.message,
            sentiment=compound,
        )
    )
    db.add(
        ChatMessage(user_id=user.id, role=ChatRole.assistant, content=reply)
    )
    db.commit()

    return ChatOut(reply=reply, sentiment=compound, source=source, model=model)


@router.get("/chat/history", response_model=list[ChatMessageOut])
def history(
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Newest N, then reversed to chronological order — ordering ascending before
    # LIMIT would return the *oldest* N once a user has more than `limit` rows.
    msgs = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.ts.desc(), ChatMessage.id.desc())
        .limit(limit)
    ).all()
    return list(reversed(msgs))
