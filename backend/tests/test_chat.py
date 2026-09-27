"""Chat module: sentiment, the rule-based fallback, and the OpenRouter path.

The OpenRouter tests drive real httpx request building through
``httpx.MockTransport`` rather than stubbing the call, so header, status and
JSON-decode handling are all exercised. No network is used.
"""

import httpx
import pytest

from app.chat import llm, sentiment
from app.config import settings

PRIMARY = "test/primary:free"
BACKUP = "test/backup:free"


def _catalogue(ids, *, price="0"):
    return {
        "data": [
            {"id": i, "pricing": {"prompt": price, "completion": price, "request": "0"}}
            for i in ids
        ]
    }


def _completion(text, model=PRIMARY):
    return {
        "model": model,
        "choices": [{"message": {"role": "assistant", "content": text}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5, "cost": 0},
    }


@pytest.fixture
def openrouter(monkeypatch):
    """Arm the LLM path with a fake key; caller installs a transport."""
    monkeypatch.setattr(settings, "openrouter_api_key", "sk-or-v1-test")
    monkeypatch.setattr(settings, "openrouter_model", PRIMARY)
    monkeypatch.setattr(settings, "openrouter_fallback_model", BACKUP)
    llm.reset_cache()

    def install(handler):
        monkeypatch.setattr(llm, "_transport", httpx.MockTransport(handler))

    yield install
    llm.reset_cache()


# --- sentiment + fallback -----------------------------------------------------


def test_sentiment_tone_buckets():
    assert sentiment.tone_of(sentiment.score("I feel amazing and strong today!")) == "positive"
    assert sentiment.tone_of(sentiment.score("I'm exhausted and want to give up")) == "negative"


def test_fallback_reply_is_intent_aware():
    diet = llm.fallback_reply("what should I eat for protein?", "neutral")
    workout = llm.fallback_reply("how many squat reps?", "neutral")
    assert diet and workout and diet != workout


def test_chat_endpoint_falls_back_without_api_key(client, auth_headers, monkeypatch):
    # Explicit, so this passes by construction rather than because the ambient
    # environment happens to lack a key.
    monkeypatch.setattr(settings, "openrouter_api_key", "")
    llm.reset_cache()

    r = client.post("/chat", headers=auth_headers, json={"message": "I'm so tired"})
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "fallback"
    assert body["model"] is None
    assert body["reply"]
    assert body["sentiment"] < 0  # negative message


# --- OpenRouter happy path ----------------------------------------------------


def test_primary_model_answers(openrouter):
    seen = []

    def handler(request):
        seen.append(request)
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY, BACKUP]))
        return httpx.Response(200, json=_completion("Squat deeper!"))

    openrouter(handler)
    reply = llm.generate_reply("how do I squat?", None, "neutral")

    assert reply.source == "llm"
    assert reply.model == PRIMARY
    assert reply.text == "Squat deeper!"

    completion = seen[-1]
    assert completion.headers["Authorization"] == "Bearer sk-or-v1-test"
    import json

    payload = json.loads(completion.content)
    assert payload["model"] == PRIMARY
    # Free-only guarantees on the wire.
    assert payload["provider"]["max_price"] == {"prompt": 0, "completion": 0}


def test_history_is_passed_and_bounded(openrouter):
    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY]))
        import json

        payload = json.loads(request.content)
        roles = [m["role"] for m in payload["messages"]]
        assert roles == ["system", "user", "assistant", "user"]
        # Over-long history entries are truncated.
        assert len(payload["messages"][1]["content"]) <= 800
        return httpx.Response(200, json=_completion("ok"))

    openrouter(handler)
    history = [
        {"role": "user", "content": "x" * 5000},
        {"role": "assistant", "content": "earlier reply"},
    ]
    assert llm.generate_reply("follow up", None, "neutral", history).source == "llm"


# --- failure handling ---------------------------------------------------------


def test_backup_model_used_when_primary_errors(openrouter):
    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY, BACKUP]))
        import json

        if json.loads(request.content)["model"] == PRIMARY:
            return httpx.Response(503)
        return httpx.Response(200, json=_completion("from backup", BACKUP))

    openrouter(handler)
    reply = llm.generate_reply("hi", None, "neutral")
    assert reply.source == "llm"
    assert reply.model == BACKUP


def test_quota_429_skips_backup_and_falls_back(openrouter):
    attempts = []

    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY, BACKUP]))
        attempts.append(request)
        return httpx.Response(429, json={"error": "rate limited"})

    openrouter(handler)
    reply = llm.generate_reply("hi", None, "neutral")

    assert reply.source == "fallback"
    # Account-wide exhaustion must not cycle through models.
    assert len(attempts) == 1


def test_upstream_429_tries_the_backup_model(openrouter):
    """Seen live: qwen's shared free pool was busy (429 with provider metadata)
    while nemotron answered. That is per-model, not account quota."""

    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY, BACKUP]))
        import json

        if json.loads(request.content)["model"] == PRIMARY:
            return httpx.Response(
                429,
                json={
                    "error": {
                        "code": 429,
                        "metadata": {
                            "provider_name": "ModelRun",
                            "limit_source": "upstream_provider_shared_pool",
                        },
                    }
                },
            )
        return httpx.Response(200, json=_completion("from backup", BACKUP))

    openrouter(handler)
    reply = llm.generate_reply("hi", None, "neutral")

    assert (reply.source, reply.model) == ("llm", BACKUP)
    # And it must not trigger the account-wide cooldown.
    assert llm._cooldown_until == 0.0


def test_reasoning_is_disabled_in_every_request(openrouter):
    """Seen live: with reasoning on, nemotron's reply was its chain-of-thought,
    truncated mid-thought at max_tokens."""
    import json

    seen = []

    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY]))
        seen.append(json.loads(request.content))
        return httpx.Response(200, json=_completion("ok"))

    openrouter(handler)
    llm.generate_reply("hi", None, "neutral")
    assert seen[0]["reasoning"] == {"enabled": False}


def test_reasoning_leak_is_rejected_and_backup_used(openrouter):
    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY, BACKUP]))
        import json

        if json.loads(request.content)["model"] == PRIMARY:
            return httpx.Response(
                200, json=_completion("Here's a thinking process:\n\n1. Analyze the input")
            )
        return httpx.Response(200, json=_completion("A real reply.", BACKUP))

    openrouter(handler)
    reply = llm.generate_reply("hi", None, "neutral")
    assert (reply.text, reply.model) == ("A real reply.", BACKUP)


def test_quota_cooldown_skips_the_network(openrouter):
    calls = []

    def handler(request):
        calls.append(request)
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY]))
        return httpx.Response(429)

    openrouter(handler)
    llm.generate_reply("hi", None, "neutral")
    before = len(calls)
    assert llm.generate_reply("again", None, "neutral").source == "fallback"
    assert len(calls) == before  # no further requests during cooldown


def test_priced_model_is_refused_without_a_completion_call(openrouter):
    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY, BACKUP], price="0.0001"))
        pytest.fail("a priced model must never receive a completion request")

    openrouter(handler)
    assert llm.generate_reply("hi", None, "neutral").source == "fallback"
    assert llm.candidate_models() == []


def test_model_missing_from_catalogue_is_refused(openrouter):
    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue(["someone/else:free"]))
        pytest.fail("an unlisted model must never receive a completion request")

    openrouter(handler)
    assert llm.generate_reply("hi", None, "neutral").source == "fallback"


def test_catalogue_unreachable_fails_closed(openrouter):
    def handler(request):
        if request.url.path.endswith("/models"):
            raise httpx.ConnectError("no network")
        pytest.fail("no completion may be attempted without a price check")

    openrouter(handler)
    assert llm.generate_reply("hi", None, "neutral").source == "fallback"
    assert llm.llm_enabled() is False


def test_malformed_completion_falls_back(openrouter):
    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY]))
        return httpx.Response(200, json={"unexpected": True})

    openrouter(handler)
    assert llm.generate_reply("hi", None, "neutral").source == "fallback"


def test_empty_completion_falls_back(openrouter):
    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY]))
        return httpx.Response(200, json=_completion("   "))

    openrouter(handler)
    assert llm.generate_reply("hi", None, "neutral").source == "fallback"


def test_timeout_falls_back(openrouter):
    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=_catalogue([PRIMARY]))
        raise httpx.ReadTimeout("too slow")

    openrouter(handler)
    assert llm.generate_reply("hi", None, "neutral").source == "fallback"


# --- history endpoint ---------------------------------------------------------


def test_chat_history_ordered(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "")
    llm.reset_cache()

    client.post("/chat", headers=auth_headers, json={"message": "hello"})
    r = client.get("/chat/history", headers=auth_headers)
    assert r.status_code == 200
    msgs = r.json()
    assert len(msgs) == 2  # user + assistant
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "assistant"


def test_chat_history_returns_the_most_recent(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "openrouter_api_key", "")
    llm.reset_cache()

    for i in range(4):
        client.post("/chat", headers=auth_headers, json={"message": f"msg {i}"})

    # 8 rows exist; asking for 2 must give the newest pair, not the oldest.
    msgs = client.get("/chat/history?limit=2", headers=auth_headers).json()
    assert [m["role"] for m in msgs] == ["user", "assistant"]
    assert msgs[0]["content"] == "msg 3"
