"""Shared pytest fixtures: isolated DB, TestClient, auth token.

The environment is pinned *before* importing anything from ``app``, because
``app.config`` reads the project-root ``.env`` and ``app.db`` builds its engine
at import time. Without this, a developer's real ``DATABASE_URL`` or
``OPENROUTER_API_KEY`` would silently change what the suite tests — and the
direct ``SessionLocal()`` call sites (``app/iot/ws.py``, ``app/seed.py``) are
not covered by the ``get_db`` override, so they would reach a real database.
"""

import os

# Point at PostgreSQL to also run the @pytest.mark.postgres suite, e.g.
# TEST_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/kinetiq_test
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")

os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["DATABASE_URL_UNPOOLED"] = ""
os.environ["OPENROUTER_API_KEY"] = ""
os.environ["JWT_SECRET"] = "test-only-secret-not-the-placeholder"
os.environ["APP_ENV"] = "local"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import NullPool, StaticPool  # noqa: E402

from app.auth.security import create_access_token, hash_password  # noqa: E402
from app.db import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.user import User  # noqa: E402
from app.ratelimit import limiter  # noqa: E402

_IS_SQLITE = TEST_DATABASE_URL.startswith("sqlite")

if _IS_SQLITE:
    # In-memory SQLite shared across connections within a test.
    _engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
else:
    _engine = create_engine(TEST_DATABASE_URL, poolclass=NullPool, future=True)

_TestSession = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)


def pytest_collection_modifyitems(config, items):
    """Skip PostgreSQL-only tests unless TEST_DATABASE_URL points at one."""
    if not _IS_SQLITE:
        return
    skip = pytest.mark.skip(reason="needs TEST_DATABASE_URL pointing at PostgreSQL")
    for item in items:
        if "postgres" in item.keywords:
            item.add_marker(skip)


@pytest.fixture(scope="session", autouse=True)
def _assert_test_env():
    """Fail loudly if a real credential leaked into the suite."""
    from app.config import settings

    assert settings.database_url == TEST_DATABASE_URL, "a real DATABASE_URL leaked into tests"
    assert not settings.openrouter_api_key, "a real OPENROUTER_API_KEY leaked into tests"


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """slowapi keeps counts in-process; reset so per-test login/register calls
    don't bleed into each other and trip the 5/min limit spuriously."""
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
def db():
    Base.metadata.create_all(_engine)
    session = _TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(_engine)


@pytest.fixture
def client(db):
    def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def session_factory():
    """The test session factory, for app code that opens its own session
    (the IoT WebSocket and the nudge sweep bypass the get_db override).

    Exposed as a fixture rather than imported: pytest loads this file as the
    `conftest` module, so `from tests.conftest import ...` would create a
    second module object with a second in-memory engine.
    """
    return _TestSession


@pytest.fixture
def test_database_url():
    return TEST_DATABASE_URL


@pytest.fixture
def user(db):
    u = User(email="demo@example.com", password_hash=hash_password("demo1234"))
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def auth_headers(user):
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}
