"""PostgreSQL-only checks: the migration, and the types the dialect can break.

Skipped unless TEST_DATABASE_URL points at PostgreSQL. These cover what the
SQLite suite structurally cannot: real DDL from Alembic, native-enum leakage,
JSONB, timestamptz, and Decimal-returning aggregates.
"""

import os

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.models.enums import Exercise
from app.models.diet import DietPlan
from app.models.engagement import ChatMessage
from app.models.enums import ChatRole
from app.models.workout import PerformanceScore, WorkoutSession

pytestmark = pytest.mark.postgres

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")

_ENUM_TYPE_NAMES = (
    "role",
    "sex",
    "goal",
    "activitylevel",
    "dietpref",
    "exercise",
    "chatrole",
    "devicetype",
    "devicestatus",
    "sensormetric",
)

_EXPECTED_TABLES = {
    "users",
    "profiles",
    "chat_messages",
    "devices",
    "sensor_readings",
    "diet_plans",
    "nutrition_logs",
    "habit_logs",
    "nudges",
    "workout_sessions",
    "rep_events",
    "performance_scores",
    "gym_recommendations",
    "llm_usage",
    "alembic_version",
}


@pytest.fixture
def migrated():
    """A schema built by Alembic, on its own connection, torn down after."""
    engine = create_engine(TEST_DATABASE_URL, future=True)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))

    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    command.upgrade(cfg, "head")
    try:
        yield engine
    finally:
        with engine.begin() as conn:
            conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        engine.dispose()


def test_migration_builds_every_table(migrated):
    assert set(inspect(migrated).get_table_names()) == _EXPECTED_TABLES


def test_migration_creates_no_native_enum_types(migrated):
    """Native enums are not dropped by drop_all or by downgrade, which is why
    the models use VARCHAR instead."""
    with migrated.connect() as conn:
        leaked = conn.execute(
            text("SELECT typname FROM pg_type WHERE typname = ANY(:names)"),
            {"names": list(_ENUM_TYPE_NAMES)},
        ).scalars().all()
    assert leaked == []


def test_enum_columns_are_varchar(migrated):
    cols = {c["name"]: c for c in inspect(migrated).get_columns("users")}
    assert "VARCHAR" in str(cols["role"]["type"]).upper()


def test_timestamps_are_timezone_aware(migrated):
    cols = {c["name"]: c for c in inspect(migrated).get_columns("sensor_readings")}
    assert cols["ts"]["type"].timezone is True


def test_json_columns_are_jsonb(migrated):
    cols = {c["name"]: c for c in inspect(migrated).get_columns("diet_plans")}
    assert str(cols["macros"]["type"]).upper() == "JSONB"


def test_nudge_unique_constraint_exists(migrated):
    constraints = inspect(migrated).get_unique_constraints("nudges")
    match = [c for c in constraints if set(c["column_names"]) == {"user_id", "nudge_date"}]
    assert match, f"uq_nudge_user_date missing, found {constraints}"


def test_retention_index_on_ts_exists(migrated):
    names = {i["name"] for i in inspect(migrated).get_indexes("sensor_readings")}
    assert "ix_sensor_ts" in names


def test_migration_round_trips(migrated):
    """upgrade -> downgrade -> upgrade. The previous migration could not do
    this on PostgreSQL: it created enum types it never dropped."""
    cfg = Config("alembic.ini")
    cfg.set_main_option("script_location", "alembic")
    command.downgrade(cfg, "base")
    remaining = set(inspect(migrated).get_table_names()) - {"alembic_version"}
    assert remaining == set()
    command.upgrade(cfg, "head")
    assert set(inspect(migrated).get_table_names()) == _EXPECTED_TABLES


# --- dialect behaviour through the ORM / API ----------------------------------


def test_jsonb_and_timestamptz_round_trip(db, user):
    plan = DietPlan(
        user_id=user.id,
        macros={"protein_g": 150, "carbs_g": 200},
        meals=[{"name": "Lunch", "kcal": 600}],
        grocery=["rice", "chicken"],
    )
    db.add(plan)
    db.add(ChatMessage(user_id=user.id, role=ChatRole.user, content="hi"))
    db.commit()
    db.refresh(plan)

    assert plan.macros["protein_g"] == 150
    assert plan.meals[0]["name"] == "Lunch"
    assert plan.grocery == ["rice", "chicken"]

    msg = db.query(ChatMessage).one()
    assert msg.ts.tzinfo is not None  # timestamptz, unlike SQLite


def test_aggregate_endpoints_return_json_floats(client, db, user):
    """PostgreSQL's avg()/sum() return Decimal; the routers must cast."""
    from app.auth.security import create_access_token
    from app.models.enums import Role

    user.role = Role.admin
    session = WorkoutSession(user_id=user.id, exercise=Exercise.squat, total_reps=10)
    db.add(session)
    db.flush()
    db.add(PerformanceScore(user_id=user.id, session_id=session.id, score=85.0))
    db.commit()

    headers = {"Authorization": f"Bearer {create_access_token(user.id)}"}
    body = client.get("/admin/analytics", headers=headers).json()

    assert isinstance(body["avg_performance_score"], float)
    assert body["avg_performance_score"] == 85.0
    assert body["sessions_by_exercise"] == {"squat": 1}
