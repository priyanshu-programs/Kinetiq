from functools import lru_cache

from loguru import logger
from pydantic_settings import BaseSettings, SettingsConfigDict

_JWT_SECRET_PLACEHOLDER = "change-me-to-a-long-random-secret"


class Settings(BaseSettings):
    """Application settings loaded from environment / project-root .env."""

    # Read the project-root .env (one level up from /backend).
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # "local" tolerates dev defaults; "production" fails closed on them.
    app_env: str = "local"

    # CORS — comma-separated origins (the Vite dev server).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Auth / JWT
    jwt_secret: str = _JWT_SECRET_PLACEHOLDER
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Database. Runtime uses the pooled Neon endpoint; Alembic uses the direct
    # (unpooled) one, which is why they are separate settings.
    database_url: str = "sqlite:///./app.db"
    database_url_unpooled: str = ""

    # LLM — OpenRouter free models only. Keys stay server-side.
    openrouter_api_key: str = ""
    openrouter_model: str = "qwen/qwen3.8-27b:free"
    openrouter_fallback_model: str = "nvidia/nemotron-3.5-lightning:free"
    # Budget for the whole primary -> backup chain, not per attempt.
    openrouter_timeout_seconds: float = 12.0
    # OpenRouter's free quota is per *account*, not per user.
    openrouter_daily_budget: int = 50

    # Habit nudges
    nudge_risk_threshold: float = 0.6

    # Raw simulated sensor readings older than this are pruned.
    sensor_retention_days: int = 7

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def runtime_database_url(self) -> str:
        return _normalize_db_url(self.database_url)

    @property
    def migration_database_url(self) -> str:
        """Direct (unpooled) URL for Alembic, falling back to the runtime one."""
        return _normalize_db_url(self.database_url_unpooled or self.database_url)


def _normalize_db_url(url: str) -> str:
    """Pin PostgreSQL URLs to the psycopg 3 driver.

    Neon's console hands out ``postgresql://``, which SQLAlchemy resolves to
    psycopg2 — a driver we do not install.
    """
    for prefix in ("postgresql+", "postgres+"):
        if url.startswith(prefix):
            return url
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    return url


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.is_production and settings.jwt_secret == _JWT_SECRET_PLACEHOLDER:
        logger.warning(
            "JWT_SECRET is the insecure default placeholder. Set a strong, "
            "random JWT_SECRET via .env before any non-local deployment."
        )
    return settings


def validate_runtime_settings(settings: Settings) -> None:
    """Fail closed on an unsafe deployment. Called from the app lifespan.

    Deliberately not part of ``get_settings()``: that runs at import time in
    every test, whereas the lifespan does not run under a bare ``TestClient``.
    """
    if not settings.is_production:
        return
    problems = []
    if settings.jwt_secret == _JWT_SECRET_PLACEHOLDER:
        problems.append("JWT_SECRET is still the placeholder default")
    if settings.runtime_database_url.startswith("sqlite"):
        problems.append(
            "DATABASE_URL must be a PostgreSQL URL (the API filesystem is ephemeral)"
        )
    if not settings.database_url_unpooled:
        problems.append("DATABASE_URL_UNPOOLED is required for migrations")
    if any("localhost" in o for o in settings.cors_origin_list):
        problems.append("CORS_ORIGINS still contains localhost")
    if problems:
        raise RuntimeError("Unsafe production configuration: " + "; ".join(problems))


settings = get_settings()
