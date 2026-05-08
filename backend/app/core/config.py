from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    app_name: str = "API планировщика тренировок"
    api_prefix: str = "/api"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/fitness_tracker"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str = Field(default="change-this-secret-key-in-env", min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    aws_endpoint_url: str | None = None
    aws_default_region: str | None = None
    aws_s3_bucket_name: str | None = None
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

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


settings = Settings()
