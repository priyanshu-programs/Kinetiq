"""Admin analytics: role-gated (403 for users, 200 + aggregates for admins)."""

import pytest

from app.auth.security import create_access_token, hash_password
from app.models.enums import Exercise, Role
from app.models.user import User
from app.models.workout import PerformanceScore, WorkoutSession


@pytest.fixture
def admin(db):
    a = User(
        email="admin@example.com",
        password_hash=hash_password("admin1234"),
        role=Role.admin,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@pytest.fixture
def admin_headers(admin):
    return {"Authorization": f"Bearer {create_access_token(admin.id)}"}


def test_analytics_forbidden_for_normal_user(client, auth_headers):
    assert client.get("/admin/analytics", headers=auth_headers).status_code == 403


def test_analytics_requires_auth(client):
    assert client.get("/admin/analytics").status_code == 401


def test_analytics_aggregates_for_admin(client, admin_headers, db, admin):
    s1 = WorkoutSession(user_id=admin.id, exercise=Exercise.squat, total_reps=5)
    s2 = WorkoutSession(user_id=admin.id, exercise=Exercise.pushup, total_reps=8)
    db.add_all([s1, s2])
    db.flush()
    db.add(PerformanceScore(user_id=admin.id, session_id=s1.id, score=80.0))
    db.add(PerformanceScore(user_id=admin.id, session_id=s2.id, score=90.0))
    db.commit()

    body = client.get("/admin/analytics", headers=admin_headers).json()
    assert body["total_users"] == 1
    assert body["total_sessions"] == 2
    assert body["avg_performance_score"] == 85.0
    assert body["sessions_by_exercise"] == {"squat": 1, "pushup": 1}
