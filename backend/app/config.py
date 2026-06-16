from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment / project-root .env."""

    # Read the project-root .env (one level up from /backend).
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # CORS — comma-separated origins (the Vite dev server).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Auth / JWT
    jwt_secret: str = "change-me-to-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Database
    database_url: str = "sqlite:///./app.db"

    # LLM / IoT (used in later phases)
    gemini_api_key: str = ""
    mqtt_host: str = "localhost"
    mqtt_port: int = 1883

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
