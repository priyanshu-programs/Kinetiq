"""Performance-score computation.

Pure functions (no DB, no FastAPI) so they are directly unit-testable.
Formula (per plan.md):
    score = 0.5 * form_avg + 0.3 * consistency + 0.2 * completion   (all 0-100)
"""

from __future__ import annotations

import statistics

from app.models.enums import Exercise

# A "full" session per exercise — completion is measured against this.
TARGET_REPS: dict[Exercise, int] = {
    Exercise.squat: 12,
    Exercise.pushup: 12,
    Exercise.bicep_curl: 12,
}
DEFAULT_TARGET_REPS = 12


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def compute_score(
    form_scores: list[float],
    total_reps: int,
    exercise: Exercise,
) -> tuple[float, float, float]:
    """Return (score, efficiency, consistency), each in [0, 100].

    - efficiency  = mean per-rep form score.
    - consistency = 100 - stddev(form scores)  (lower variance => higher).
    - completion  = reps done vs. the per-exercise target, capped at 100.
    """
    if not form_scores:
        return 0.0, 0.0, 0.0

    efficiency = _clamp(statistics.fmean(form_scores))

    if len(form_scores) > 1:
        consistency = _clamp(100.0 - statistics.pstdev(form_scores))
    else:
        consistency = 100.0

    target = TARGET_REPS.get(exercise, DEFAULT_TARGET_REPS)
    completion = _clamp((total_reps / target) * 100.0)

    score = _clamp(0.5 * efficiency + 0.3 * consistency + 0.2 * completion)
    return round(score, 2), round(efficiency, 2), round(consistency, 2)
