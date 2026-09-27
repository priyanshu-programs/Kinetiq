"""Gym-buddy reply generation: OpenRouter free models + rule-based fallback.

Free-only by construction. Configured model ids are checked against the live
catalogue and must be zero-priced before any completion request is sent; if
that cannot be established the module fails closed to a labelled basic reply
rather than risk a paid call. The fallback also guarantees the demo never
hard-fails offline or without an API key.
"""

from __future__ import annotations

import time
from typing import NamedTuple

import httpx
from loguru import logger

from app.config import settings
from app.models.user import Profile

Source = str  # "llm" | "fallback"

_BASE_URL = "https://openrouter.ai/api/v1"
_CONNECT_CAP = 3.0
# Don't start an attempt that cannot plausibly finish inside the budget.
_MIN_ATTEMPT_SECONDS = 2.5
_MAX_TOKENS = 300
_HISTORY_CHAR_CAP = 800
# Re-check the catalogue occasionally so a transient failure self-heals
# instead of disabling the LLM for the life of the process.
_CATALOGUE_TTL_SECONDS = 900.0

# Tests inject an httpx.MockTransport here.
_transport: httpx.BaseTransport | None = None

_candidates_cache: list[str] | None = None
_candidates_checked_at = 0.0
# Set when the account's quota is reported exhausted; skips the network.
_cooldown_until = 0.0

_TONE_OPENER = {
    "negative": "I hear you, and it's okay to have tough days. ",
    "neutral": "",
    "positive": "Love the energy! ",
}


class Reply(NamedTuple):
    text: str
    source: Source
    model: str | None = None


class _Attempt(NamedTuple):
    text: str | None
    # True when retrying another model cannot help (bad key, billing, quota).
    stop: bool


def reset_cache() -> None:
    """Drop cached catalogue state. For tests and for config changes."""
    global _candidates_cache, _candidates_checked_at, _cooldown_until
    _candidates_cache = None
    _candidates_checked_at = 0.0
    _cooldown_until = 0.0


def _client(timeout: httpx.Timeout) -> httpx.Client:
    return httpx.Client(timeout=timeout, transport=_transport)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "X-Title": "Kinetiq",
    }


def _is_free(record: dict) -> bool:
    pricing = record.get("pricing") or {}
    fields = ("prompt", "completion", "request")
    try:
        return all(float(pricing.get(f) or 0) == 0.0 for f in fields)
    except (TypeError, ValueError):
        return False


def _fetch_catalogue() -> dict[str, dict]:
    timeout = httpx.Timeout(connect=_CONNECT_CAP, read=8.0, write=8.0, pool=8.0)
    with _client(timeout) as client:
        resp = client.get(f"{_BASE_URL}/models", headers=_headers())
        resp.raise_for_status()
        data = resp.json()
    return {rec["id"]: rec for rec in data.get("data", []) if rec.get("id")}


def candidate_models(*, force: bool = False) -> list[str]:
    """Configured models confirmed present in the catalogue at zero price.

    An empty list means no completion request may be sent.
    """
    global _candidates_cache, _candidates_checked_at

    fresh = time.monotonic() - _candidates_checked_at < _CATALOGUE_TTL_SECONDS
    if _candidates_cache is not None and fresh and not force:
        return _candidates_cache

    configured = [
        m for m in (settings.openrouter_model, settings.openrouter_fallback_model) if m
    ]
    try:
        catalogue = _fetch_catalogue()
    except Exception as exc:  # noqa: BLE001 — fail closed, and retry after the TTL
        logger.warning("OpenRouter catalogue check failed, using basic replies: {}", exc)
        _candidates_cache, _candidates_checked_at = [], time.monotonic()
        return []

    approved = []
    for model_id in configured:
        record = catalogue.get(model_id)
        if record is None:
            logger.warning("OpenRouter model {} is not in the live catalogue", model_id)
        elif not _is_free(record):
            logger.warning("OpenRouter model {} is not zero-priced; refusing it", model_id)
        else:
            approved.append(model_id)

    if not approved:
        free_ids = sorted(m for m, r in catalogue.items() if _is_free(r))
        logger.warning(
            "No configured OpenRouter model is usable. Zero-priced ids available: {}",
            ", ".join(free_ids[:25]) or "none",
        )

    _candidates_cache, _candidates_checked_at = approved, time.monotonic()
    return approved


def llm_enabled() -> bool:
    """Whether a real model call is currently possible (surfaced by /health)."""
    return bool(settings.openrouter_api_key) and bool(candidate_models())


def _profile_context(profile: Profile | None) -> str:
    if profile is None:
        return "The user has not filled in their profile yet."
    parts = []
    if profile.goal:
        parts.append(f"goal={profile.goal.value}")
    if profile.activity_level:
        parts.append(f"activity={profile.activity_level.value}")
    if profile.diet_pref:
        parts.append(f"diet={profile.diet_pref.value}")
    if profile.bmi:
        parts.append(f"bmi={profile.bmi}")
    return "User profile: " + (", ".join(parts) if parts else "incomplete") + "."


def _system_prompt(profile: Profile | None, tone: str) -> str:
    return (
        "You are 'Gym Buddy', a friendly, motivating fitness coach. "
        "Keep replies short (2-4 sentences), practical, and encouraging. "
        "You are NOT a doctor — never give medical diagnoses; add a brief "
        "'not medical advice' note if the user asks about health conditions. "
        f"{_profile_context(profile)} "
        f"The user's current mood seems {tone}; adapt your tone accordingly."
    )


def _build_messages(
    message: str, profile: Profile | None, tone: str, history: list[dict] | None
) -> list[dict]:
    messages = [{"role": "system", "content": _system_prompt(profile, tone)}]
    for turn in history or []:
        content = (turn.get("content") or "")[:_HISTORY_CHAR_CAP]
        if content and turn.get("role") in ("user", "assistant"):
            messages.append({"role": turn["role"], "content": content})
    messages.append({"role": "user", "content": message})
    return messages


def _remaining(deadline: float) -> httpx.Timeout:
    left = max(0.0, deadline - time.monotonic())
    return httpx.Timeout(connect=min(_CONNECT_CAP, left), read=left, write=left, pool=left)


def _is_upstream_rate_limit(resp: httpx.Response) -> bool:
    """A 429 from the model's provider, as opposed to OpenRouter's account quota.

    Upstream errors carry ``error.metadata.provider_name`` / ``limit_source``;
    an account-level limit does not.
    """
    try:
        meta = (resp.json().get("error") or {}).get("metadata") or {}
    except (ValueError, AttributeError):
        return False
    return bool(meta.get("provider_name")) or str(meta.get("limit_source", "")).startswith(
        "upstream"
    )


def _leaks_reasoning(text: str) -> bool:
    """Backstop for a model that ignores ``reasoning.enabled = false``."""
    return text.lower().startswith(("here's a thinking process", "thinking process:"))


def _attempt(model: str, messages: list[dict], timeout: httpx.Timeout) -> _Attempt:
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": _MAX_TOKENS,
        "temperature": 0.7,
        # Report cost/usage back so zero spend is observable.
        "usage": {"include": True},
        # Refuse to be routed to a paid provider for this model.
        "provider": {"max_price": {"prompt": 0, "completion": 0}},
        # Reasoning models (nemotron-3.5-lightning, qwen3.x) otherwise write
        # their chain-of-thought into `content` and exhaust max_tokens on it,
        # so the "reply" is "Here's a thinking process: 1. Analyze…".
        "reasoning": {"enabled": False},
    }
    started = time.monotonic()
    try:
        with _client(timeout) as client:
            resp = client.post(
                f"{_BASE_URL}/chat/completions", json=payload, headers=_headers()
            )
    except httpx.TimeoutException:
        logger.warning("OpenRouter {} timed out", model)
        return _Attempt(None, stop=False)
    except httpx.HTTPError as exc:
        logger.warning("OpenRouter {} transport error: {}", model, exc)
        return _Attempt(None, stop=False)

    elapsed_ms = int((time.monotonic() - started) * 1000)

    if resp.status_code in (401, 403):
        logger.error("OpenRouter rejected the API key ({})", resp.status_code)
        return _Attempt(None, stop=True)
    if resp.status_code == 402:
        logger.error("OpenRouter asked for credits; refusing to pay, using basic replies")
        return _Attempt(None, stop=True)
    if resp.status_code == 429:
        if _is_upstream_rate_limit(resp):
            # One model's shared free pool is busy. Another model can still
            # answer, so this is not a reason to stop or to cool down.
            logger.warning("OpenRouter {} is rate-limited upstream", model)
            return _Attempt(None, stop=False)
        global _cooldown_until
        _cooldown_until = time.monotonic() + 300.0
        logger.warning("OpenRouter quota exhausted for the account; cooling down")
        return _Attempt(None, stop=True)
    if resp.status_code >= 400:
        logger.warning("OpenRouter {} returned {}", model, resp.status_code)
        return _Attempt(None, stop=False)

    try:
        data = resp.json()
        text = (data["choices"][0]["message"]["content"] or "").strip()
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        logger.warning("OpenRouter {} sent an unusable response: {}", model, exc)
        return _Attempt(None, stop=False)

    if not text:
        logger.warning("OpenRouter {} returned an empty reply", model)
        return _Attempt(None, stop=False)

    if _leaks_reasoning(text):
        logger.warning("OpenRouter {} returned its reasoning instead of a reply", model)
        return _Attempt(None, stop=False)

    logger.info(
        "OpenRouter reply model={} latency_ms={} usage={}",
        data.get("model", model),
        elapsed_ms,
        data.get("usage"),
    )
    return _Attempt(text, stop=False)


def fallback_reply(message: str, tone: str) -> str:
    """Deterministic intent-based reply (no network)."""
    text = message.lower()
    opener = _TONE_OPENER.get(tone, "")
    if any(w in text for w in ("diet", "eat", "food", "meal", "calorie", "protein")):
        body = (
            "For nutrition, aim for lean protein at each meal, plenty of veggies, "
            "and water before snacking. Generate a plan in the Dietician tab for specifics."
        )
    elif any(w in text for w in ("workout", "exercise", "rep", "squat", "train", "muscle")):
        body = (
            "Consistency beats intensity — 3-4 focused sessions a week with good form "
            "wins. Try the AI Trainer to check your reps and form live."
        )
    elif any(w in text for w in ("tired", "lazy", "skip", "give up", "unmotivated", "sad")):
        body = (
            "Every small step counts. Just do a 10-minute warm-up — momentum usually "
            "carries you the rest of the way."
        )
    else:
        body = (
            "I'm here to help with workouts, nutrition, and motivation. "
            "What would you like to focus on today?"
        )
    return (opener + body).strip()


def generate_reply(
    message: str,
    profile: Profile | None,
    tone: str,
    history: list[dict] | None = None,
) -> Reply:
    """Try each approved free model within one shared time budget, then fall back."""
    if not settings.openrouter_api_key or time.monotonic() < _cooldown_until:
        return Reply(fallback_reply(message, tone), "fallback")

    models = candidate_models()
    if not models:
        return Reply(fallback_reply(message, tone), "fallback")

    messages = _build_messages(message, profile, tone, history)
    # One budget for the whole primary -> backup chain, so a dead provider
    # cannot cost the user two full timeouts.
    deadline = time.monotonic() + settings.openrouter_timeout_seconds

    for model in models:
        if deadline - time.monotonic() < _MIN_ATTEMPT_SECONDS:
            logger.warning("OpenRouter budget spent before trying {}", model)
            break
        outcome = _attempt(model, messages, _remaining(deadline))
        if outcome.text:
            return Reply(outcome.text, "llm", model)
        if outcome.stop:
            break

    return Reply(fallback_reply(message, tone), "fallback")
