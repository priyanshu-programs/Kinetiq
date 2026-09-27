"""Configuration: database URL normalization and the fail-closed production guard."""

import pytest

from app.config import Settings, _normalize_db_url, validate_runtime_settings


def _production(**overrides) -> Settings:
    base = dict(
        app_env="production",
        jwt_secret="a-real-long-random-secret",
        database_url="postgresql://u:p@ep-x-pooler.eu.aws.neon.tech/db?sslmode=require",
        database_url_unpooled="postgresql://u:p@ep-x.eu.aws.neon.tech/db?sslmode=require",
        cors_origins="https://app.vercel.app",
    )
    base.update(overrides)
    return Settings(**base)


# --- URL normalization --------------------------------------------------------


@pytest.mark.parametrize(
    "given",
    [
        "postgresql://u:p@host/db",
        "postgres://u:p@host/db",
    ],
)
def test_bare_postgres_urls_are_pinned_to_psycopg(given):
    """Neon hands out `postgresql://`, which SQLAlchemy would resolve to
    psycopg2 — a driver this project does not install."""
    assert _normalize_db_url(given).startswith("postgresql+psycopg://")
    assert _normalize_db_url(given).endswith("u:p@host/db")


def test_an_explicit_driver_is_left_alone():
    url = "postgresql+psycopg://u:p@host/db"
    assert _normalize_db_url(url) == url


def test_sqlite_is_left_alone():
    assert _normalize_db_url("sqlite:///./app.db") == "sqlite:///./app.db"


def test_settings_expose_normalized_urls():
    s = _production()
    assert s.runtime_database_url.startswith("postgresql+psycopg://")
    assert "-pooler" in s.runtime_database_url
    # Alembic gets the direct endpoint.
    assert "-pooler" not in s.migration_database_url


def test_migration_url_falls_back_to_the_runtime_url():
    s = Settings(database_url="postgresql://u:p@host/db", database_url_unpooled="")
    assert s.migration_database_url == s.runtime_database_url


# --- fail-closed guard --------------------------------------------------------


def test_valid_production_config_passes():
    validate_runtime_settings(_production())  # does not raise


def test_local_env_tolerates_every_dev_default():
    """The guard must never fire locally, or the test suite and local runs break."""
    validate_runtime_settings(Settings(app_env="local"))


def test_placeholder_jwt_secret_is_rejected():
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_runtime_settings(_production(jwt_secret="change-me-to-a-long-random-secret"))


def test_sqlite_in_production_is_rejected():
    """The API filesystem is ephemeral, so SQLite would silently lose user data."""
    with pytest.raises(RuntimeError, match="PostgreSQL"):
        validate_runtime_settings(_production(database_url="sqlite:///./app.db"))


def test_missing_unpooled_url_is_rejected():
    with pytest.raises(RuntimeError, match="UNPOOLED"):
        validate_runtime_settings(_production(database_url_unpooled=""))


def test_localhost_cors_origin_is_rejected():
    with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
        validate_runtime_settings(_production(cors_origins="http://localhost:5173"))


def test_app_starts_and_reports_llm_state():
    """Exercises the real lifespan: the config guard, the model check, and the
    IoT loop shutdown. The rest of the suite uses a bare TestClient, which
    skips all of it."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        body = c.get("/health").json()

    assert body["status"] == "ok"
    # No key is configured in tests, so the LLM path must report itself off.
    assert body["llm_enabled"] is False


def test_all_problems_are_reported_together():
    with pytest.raises(RuntimeError) as exc:
        validate_runtime_settings(
            _production(
                jwt_secret="change-me-to-a-long-random-secret",
                database_url="sqlite:///./app.db",
                database_url_unpooled="",
            )
        )
    message = str(exc.value)
    assert "JWT_SECRET" in message
    assert "PostgreSQL" in message
    assert "UNPOOLED" in message
