"""Recommender: content scoring monotonicity + endpoint sorting + geocode fallback."""

from app.models.enums import Goal
from app.models.user import Profile
from app.reco import service


def _profile(goal: Goal) -> Profile:
    return Profile(user_id=1, goal=goal)


def test_score_rewards_tag_overlap():
    gain_gym = {"tags": ["gain", "strength", "powerlifting"], "free": False}
    yoga_gym = {"tags": ["yoga", "mobility"], "free": False}
    p = _profile(Goal.gain)
    gain_score, _ = service.score_gym(p, gain_gym, 1.0)
    yoga_score, _ = service.score_gym(p, yoga_gym, 1.0)
    assert gain_score > yoga_score


def test_closer_gym_ranks_higher_when_tags_equal():
    gym = {"tags": ["lose", "cardio"], "free": False}
    p = _profile(Goal.lose)
    near, _ = service.score_gym(p, gym, 1.0)
    far, _ = service.score_gym(p, gym, 25.0)
    assert near > far


def test_recommend_returns_sorted_list():
    results = service.recommend(_profile(Goal.gain))
    assert len(results) == 6
    scores = [r["match_score"] for r in results]
    assert scores == sorted(scores, reverse=True)


def test_geocode_failure_falls_back(monkeypatch):
    monkeypatch.setattr(service, "geocode_city", lambda city: None)
    results = service.recommend(_profile(Goal.lose), city="Nowhereville")
    assert len(results) == 6  # still works using default reference


def test_endpoint_returns_recommendations(client, auth_headers):
    r = client.get("/recommendations", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 6
    assert all("match_score" in g for g in body)
