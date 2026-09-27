"""Skip-risk prediction: logistic regression on a synthetic bootstrap blended with
the user's own habit logs. Tiny data, explainable, trains in milliseconds.

Implemented in pure numpy (gradient descent) rather than scikit-learn: the demo
machine is memory-constrained and pulling in scipy/sklearn just for one logistic
regression is wasteful. The semantics are identical.

``predict_skip_risk`` always returns a probability in [0, 1] plus human-readable
factors — safe even with zero logs (cold start leans on the synthetic prior).
"""

from __future__ import annotations

from functools import lru_cache

import numpy as np

from app.models.engagement import HabitLog
from app.timeutil import utc_today

# Feature order: [is_weekend, time_of_day, recent_completion_rate, streak]
_DEFAULT_TIME = 18
_N_SYNTHETIC = 400


def _sigmoid(z: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))


def _synthetic_dataset() -> tuple[np.ndarray, np.ndarray]:
    """Generate a labelled (features, skipped) dataset from a known generative rule."""
    rng = np.random.default_rng(42)
    weekend = rng.integers(0, 2, _N_SYNTHETIC)
    tod = rng.integers(5, 24, _N_SYNTHETIC)
    rate = rng.random(_N_SYNTHETIC)
    streak = rng.integers(0, 30, _N_SYNTHETIC)

    logit = -0.5 + 1.5 * weekend + 0.08 * (tod - 12) - 3.0 * rate - 0.1 * streak
    prob_skip = _sigmoid(logit)
    skipped = (rng.random(_N_SYNTHETIC) < prob_skip).astype(float)

    x = np.column_stack([weekend, tod, rate, streak]).astype(float)
    return x, skipped


def _train(x: np.ndarray, y: np.ndarray):
    """Standardise + fit logistic regression by gradient descent."""
    mu = x.mean(axis=0)
    sd = x.std(axis=0) + 1e-9
    xs = (x - mu) / sd
    n, d = xs.shape
    w = np.zeros(d)
    b = 0.0
    lr = 0.3
    for _ in range(800):
        p = _sigmoid(xs @ w + b)
        err = p - y
        w -= lr * (xs.T @ err) / n
        b -= lr * err.mean()
    return w, b, mu, sd


def _features_from_logs(logs: list[HabitLog], today_weekday: int) -> list[float]:
    """Build today's feature vector from the user's history."""
    if logs:
        ordered = sorted(logs, key=lambda h: h.date)
        recent = ordered[-14:]
        completion_rate = sum(1 for h in recent if h.completed) / len(recent)
        # Streak: consecutive completed logs counting back from the most recent.
        streak = 0
        for h in reversed(ordered):
            if h.completed:
                streak += 1
            else:
                break
        times = [h.time_of_day for h in logs if h.time_of_day is not None]
        time_of_day = max(set(times), key=times.count) if times else _DEFAULT_TIME
    else:
        completion_rate = 0.5  # neutral prior
        streak = 0
        time_of_day = _DEFAULT_TIME

    is_weekend = 1.0 if today_weekday >= 5 else 0.0
    return [is_weekend, float(time_of_day), float(completion_rate), float(streak)]


def _explain(features: list[float]) -> list[str]:
    is_weekend, time_of_day, rate, streak = features
    factors: list[str] = []
    if rate < 0.5:
        factors.append("Low recent completion rate")
    if streak == 0:
        factors.append("No active streak")
    if is_weekend:
        factors.append("Weekend day (historically higher skip rate)")
    if time_of_day >= 20:
        factors.append("Late planned workout time")
    if not factors:
        factors.append("On track — keep the streak going")
    return factors


@lru_cache(maxsize=1)
def _trained():
    """The synthetic dataset is seeded, so training is identical every call.

    Memoized because this now runs per request (on visit-triggered nudges)
    rather than once a day in a background job.
    """
    return _train(*_synthetic_dataset())


def predict_skip_risk(
    logs: list[HabitLog], today_weekday: int | None = None
) -> tuple[float, list[str]]:
    """Return (skip_probability ∈ [0,1], factors)."""
    if today_weekday is None:
        today_weekday = utc_today().weekday()

    w, b, mu, sd = _trained()

    features = np.array(_features_from_logs(logs, today_weekday), dtype=float)
    prob = float(_sigmoid(((features - mu) / sd) @ w + b))
    return round(prob, 3), _explain(features)
