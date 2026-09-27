"""Pure sentiment scoring via VADER (offline, no network)."""

from __future__ import annotations

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = SentimentIntensityAnalyzer()

Tone = str  # "negative" | "neutral" | "positive"


def score(text: str) -> float:
    """VADER compound score in [-1, 1]."""
    return _analyzer.polarity_scores(text)["compound"]


def tone_of(compound: float) -> Tone:
    # ±0.05 is VADER's conventional neutral band.
    if compound <= -0.05:
        return "negative"
    if compound >= 0.05:
        return "positive"
    return "neutral"
