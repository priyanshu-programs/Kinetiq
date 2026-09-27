"""UTC time helpers.

The app standardises on UTC for "today". The hosted API runs in UTC, and the
frontend already derives dates with ``toISOString().slice(0, 10)`` (see
``HabitsPage.tsx`` and ``DietPage.tsx``), so UTC on the server matches what the
client sends instead of drifting from it by the developer's local offset.
"""

from datetime import date, datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def utc_today() -> date:
    return datetime.now(timezone.utc).date()
