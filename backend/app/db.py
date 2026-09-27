from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        # SQLite needs check_same_thread disabled for FastAPI's threaded workers.
        return {"connect_args": {"check_same_thread": False}}
    # Neon scales compute to zero after a few idle minutes, so pooled
    # connections go stale. pool_pre_ping discards dead ones instead of
    # raising, and pool_recycle keeps them younger than the idle timeout.
    return {
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 2,
        "pool_recycle": 300,
        "connect_args": {
            # TLS comes from the URL (Neon's string already carries
            # ?sslmode=require); hardcoding it here would break a local or CI
            # PostgreSQL that has no TLS configured.
            "connect_timeout": 10,
            "application_name": "kinetiq-api",
            # Neon's pooled endpoint is PgBouncer in transaction mode, which
            # does not support psycopg3's default server-side prepared
            # statements — they surface as intermittent
            # 'prepared statement "_pg3_0" already exists'.
            "prepare_threshold": None,
        },
    }


engine = create_engine(
    settings.runtime_database_url, future=True, **_engine_kwargs(settings.runtime_database_url)
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
