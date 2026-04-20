from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "API планировщика тренировок"
    api_prefix: str = "/api"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/fitness_tracker"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret_key: str = Field(default="change-this-secret-key-in-env", min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

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

settings = Settings()