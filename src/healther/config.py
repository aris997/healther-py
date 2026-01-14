"""Application configuration using pydantic settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Healther"
    environment: str = "development"
    secret_key: str = "dev-secret-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # database config (prefer individual vars; DATABASE_URL optional override)
    database_url: str | None = None
    postgres_host: str = "db"
    postgres_port: int = 5432
    postgres_user: str = "healther"
    postgres_password: str = "healther"
    postgres_db: str = "healther"

    redis_url: str = "redis://redis:6379/0"

    mail_from: str = "healther@localhost"
    smtp_host: str = "mailhog"
    smtp_port: int = 1025

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
