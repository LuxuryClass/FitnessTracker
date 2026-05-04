from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    is_active: bool
    streak_weeks: int
    weekly_volume_tons: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdateRequest(BaseModel):
    email: str | None = Field(default=None, min_length=5, max_length=255)
    username: str | None = Field(default=None, min_length=3, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("email не может быть null.")
        normalized = value.strip().lower()
        if "@" not in normalized:
            raise ValueError("Некорректный email.")
        return normalized

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("username не может быть null.")
        normalized = value.strip()
        if not normalized:
            raise ValueError("Имя пользователя не может быть пустым.")
        return normalized

    @model_validator(mode="after")
    def validate_payload(self) -> "UserUpdateRequest":
        if not self.model_fields_set:
            raise ValueError("Нужно передать хотя бы одно поле для обновления профиля.")
        return self

    def to_update_dict(self) -> dict[str, str]:
        update_data: dict[str, str] = {}

        if "email" in self.model_fields_set:
            update_data["email"] = self.email

        if "username" in self.model_fields_set:
            update_data["username"] = self.username

        return update_data
