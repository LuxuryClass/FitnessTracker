from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class WorkoutCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    is_planned: bool
    planned_for: datetime | None = None
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Название тренировки не может быть пустым.")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def validate_planning_fields(self) -> "WorkoutCreateRequest":
        if self.is_planned and self.planned_for is None:
            raise ValueError("Для запланированной тренировки поле planned_for обязательно.")
        if not self.is_planned and self.planned_for is not None:
            raise ValueError("Для тренировки «сейчас» поле planned_for должно быть null.")
        return self


class WorkoutResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    is_planned: bool
    planned_for: datetime | None
    description: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
