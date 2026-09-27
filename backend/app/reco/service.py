"""Content-based gym recommender over a seed dataset.

Scores each gym against the user's goal-derived interests + distance from a
reference point. Optional free Nominatim geocoding of a city; falls back to a
default reference (Delhi centre) on any failure — never blocks the demo.
"""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

import httpx
from loguru import logger

from app.models.enums import Goal
from app.models.user import Profile

_GYMS_PATH = Path(__file__).parent / "gyms.json"
_DEFAULT_REF = (28.6139, 77.2090)  # Delhi centre — used when no city is geocoded

# Goal → tags the user is likely interested in.
_GOAL_INTERESTS: dict[Goal, list[str]] = {
    Goal.lose: ["lose", "cardio", "hiit", "classes", "treadmill", "running"],
    Goal.gain: ["gain", "strength", "powerlifting", "free_weights", "functional"],
    Goal.maintain: ["maintain", "yoga", "mobility", "outdoor", "bodyweight"],
}


@lru_cache
def load_gyms() -> list[dict]:
    return json.loads(_GYMS_PATH.read_text(encoding="utf-8"))


def haversine(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Great-circle distance in km."""
    r = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return round(r * 2 * math.asin(math.sqrt(h)), 1)


def score_gym(profile: Profile | None, gym: dict, distance_km: float) -> tuple[float, str]:
    """Return (match_score 0-100, human reason)."""
    goal = profile.goal if profile else None
    interests = _GOAL_INTERESTS.get(goal, []) if goal else []
    overlap = sorted(set(gym["tags"]) & set(interests))
    tag_score = min(1.0, len(overlap) / 3.0)
    distance_score = max(0.0, 1.0 - distance_km / 30.0)
    match = 0.7 * tag_score + 0.3 * distance_score
    match_score = round(match * 100)

    bits = []
    if overlap:
        bits.append(f"matches your {goal.value} goal ({', '.join(overlap)})")
    else:
        bits.append("general fitness option")
    bits.append(f"{distance_km} km away")
    if gym.get("free"):
        bits.append("free to use")
    reason = "; ".join(bits).capitalize()
    return match_score, reason


def geocode_city(city: str) -> tuple[float, float] | None:
    """Best-effort free geocoding via OpenStreetMap Nominatim."""
    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": city, "format": "json", "limit": 1},
            headers={"User-Agent": "gym-ai-assistant/0.1"},
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as exc:  # noqa: BLE001 — geocode is optional
        logger.warning("Geocode failed for {}: {}", city, exc)
    return None


def recommend(profile: Profile | None, city: str | None = None) -> list[dict]:
    ref = (geocode_city(city) if city else None) or _DEFAULT_REF
    results = []
    for gym in load_gyms():
        distance = haversine(ref, (gym["lat"], gym["lng"]))
        match_score, reason = score_gym(profile, gym, distance)
        results.append(
            {
                "gym_id": gym["gym_id"],
                "name": gym["name"],
                "distance_km": distance,
                "match_score": match_score,
                "reason": reason,
                "free": gym.get("free", False),
            }
        )
    results.sort(key=lambda r: r["match_score"], reverse=True)
    return results
