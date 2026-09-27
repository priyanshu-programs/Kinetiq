"""Unit tests for the pure performance-score logic."""

from app.models.enums import Exercise
from app.performance.service import compute_score


def test_empty_session_is_zero_and_safe():
    score, efficiency, consistency = compute_score([], 0, Exercise.squat)
    assert (score, efficiency, consistency) == (0.0, 0.0, 0.0)


def test_perfect_full_session_is_max():
    # 12 perfect reps == target → all three components at 100.
    score, efficiency, consistency = compute_score([100.0] * 12, 12, Exercise.squat)
    assert score == 100.0
    assert efficiency == 100.0
    assert consistency == 100.0


def test_score_within_bounds():
    score, efficiency, consistency = compute_score(
        [40.0, 95.0, 10.0, 70.0, 100.0], 5, Exercise.pushup
    )
    for value in (score, efficiency, consistency):
        assert 0.0 <= value <= 100.0


def test_score_monotonic_with_form_quality():
    low = compute_score([50.0] * 12, 12, Exercise.bicep_curl)[0]
    high = compute_score([90.0] * 12, 12, Exercise.bicep_curl)[0]
    assert high > low


def test_completion_penalizes_partial_sessions():
    full = compute_score([80.0] * 12, 12, Exercise.squat)[0]
    partial = compute_score([80.0] * 3, 3, Exercise.squat)[0]
    # Same form, fewer reps → lower completion component → lower score.
    assert full > partial


def test_consistency_rewards_low_variance():
    steady = compute_score([80.0] * 6, 6, Exercise.squat)[2]
    erratic = compute_score([40.0, 100.0, 60.0, 95.0, 30.0, 90.0], 6, Exercise.squat)[2]
    assert steady > erratic
