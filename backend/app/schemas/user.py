from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class WeeklySessionsProgress(BaseModel):
    completed: int
    total: int


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    gender: Literal["male", "female"] | None
    birth_date: date | None
    height: Decimal | None
    weight: Decimal | None
    avatar_url: str | None
    is_active: bool
    streak_weeks: int
    weekly_volume_tons: Decimal
    weekly_sessions_progress: WeeklySessionsProgress
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdateRequest(BaseModel):
    email: str | None = Field(default=None, min_length=5, max_length=255)
    name: str | None = Field(default=None, min_length=3, max_length=100)
    gender: Literal["male", "female"] | None = None
    birth_date: date | None = None
    height: Decimal | None = Field(default=None, ge=0, le=999.99)
    weight: Decimal | None = Field(default=None, ge=0, le=999.99)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("email не может быть null.")
        normalized = value.strip().lower()
        if "@" not in normalized:
            raise ValueError("Некорректный email.")
        return normalized

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("name не может быть null.")
        normalized = value.strip()
        if not normalized:
            raise ValueError("Имя пользователя не может быть пустым.")
        return normalized

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: date | None) -> date | None:
        if value is None:
            return None
        if value > date.today():
            raise ValueError("Дата рождения не может быть в будущем.")
        return value

    @model_validator(mode="after")
    def validate_payload(self) -> "UserUpdateRequest":
        if not self.model_fields_set:
            raise ValueError("Нужно передать хотя бы одно поле для обновления профиля.")
        return self

    def to_update_dict(self) -> dict[str, str | date | Decimal]:
        update_data: dict[str, str | date | Decimal] = {}

        if "email" in self.model_fields_set:
            update_data["email"] = self.email

        if "name" in self.model_fields_set:
            update_data["name"] = self.name

        if "gender" in self.model_fields_set and self.gender is not None:
            update_data["gender"] = self.gender

        if "birth_date" in self.model_fields_set and self.birth_date is not None:
            update_data["birth_date"] = self.birth_date

        if "height" in self.model_fields_set and self.height is not None:
            update_data["height"] = self.height

        if "weight" in self.model_fields_set and self.weight is not None:
            update_data["weight"] = self.weight

        return update_data


class RecentProgressResponse(BaseModel):
    exercise_id: UUID
    exercise_name: str
    muscle_group: str | None
    difference_kg: Decimal
    recent_max_weight_kg: Decimal
    previous_max_weight_kg: Decimal | None

    model_config = ConfigDict(from_attributes=True)


class WeeklyMuscleFocusItem(BaseModel):
    muscle: str
    intensity: int
