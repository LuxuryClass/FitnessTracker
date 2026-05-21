from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Literal
import json


class Settings(BaseSettings):
    app_name: str = "API планировщика тренировок"
    api_prefix: str = "/api"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/flame_fitness"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str = Field(default="change-this-secret-key-in-env", min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    auth_refresh_cookie_name: str = "refresh_token"
    auth_refresh_cookie_secure: bool = True
    auth_refresh_cookie_samesite: Literal["lax", "strict", "none"] = "none"
    auth_refresh_cookie_domain: str | None = None
    auth_refresh_cookie_path: str = "/api/auth"

    aws_endpoint_url: str | None = None
    aws_default_region: str | None = None
    aws_s3_bucket_name: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    vapid_public_key: str | None = None
    vapid_private_key: str | None = None
    vapid_subject: str = "mailto:admin@example.com"

    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    backend_cors_origins: List[str] = []

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def async_database_url(self) -> str:
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return self.database_url

    @property
    def parsed_cors_origins(self) -> list[str]:
        if isinstance(self.backend_cors_origins, str):
            return json.loads(self.backend_cors_origins)
        return self.backend_cors_origins

    @property
    def refresh_cookie_max_age_seconds(self) -> int:
        return self.refresh_token_expire_days * 24 * 60 * 60


settings = Settings()
