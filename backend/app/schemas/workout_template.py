from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class WorkoutTemplateExerciseCreateItem(BaseModel):
    exercise_id: UUID


class WorkoutTemplateExerciseResponse(BaseModel):
    exercise_id: UUID
    order_index: int = Field(ge=1)


class WorkoutTemplateCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    exercises: list[WorkoutTemplateExerciseCreateItem] = Field(default_factory=list, max_length=100)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Название шаблона не может быть пустым.")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("exercises")
    @classmethod
    def validate_exercises(
        cls, value: list[WorkoutTemplateExerciseCreateItem]
    ) -> list[WorkoutTemplateExerciseCreateItem]:
        seen: set[UUID] = set()
        for item in value:
            if item.exercise_id in seen:
                raise ValueError("Упражнения в шаблоне не должны повторяться.")
            seen.add(item.exercise_id)
        return value


class WorkoutTemplateUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    exercises: list[WorkoutTemplateExerciseCreateItem] | None = Field(default=None, max_length=100)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("title не может быть null.")
        normalized = value.strip()
        if not normalized:
            raise ValueError("Название шаблона не может быть пустым.")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("exercises")
    @classmethod
    def validate_exercises(
        cls, value: list[WorkoutTemplateExerciseCreateItem] | None
    ) -> list[WorkoutTemplateExerciseCreateItem]:
        if value is None:
            raise ValueError("exercises не может быть null.")

        seen: set[UUID] = set()
        for item in value:
            if item.exercise_id in seen:
                raise ValueError("Упражнения в шаблоне не должны повторяться.")
            seen.add(item.exercise_id)
        return value

    @model_validator(mode="after")
    def validate_payload(self) -> "WorkoutTemplateUpdateRequest":
        if not self.model_fields_set:
            raise ValueError("Нужно передать хотя бы одно поле для обновления шаблона.")
        return self

    def to_update_dict(
        self,
    ) -> dict[str, str | list[WorkoutTemplateExerciseCreateItem] | None]:
        update_data: dict[str, str | list[WorkoutTemplateExerciseCreateItem] | None] = {}

        if "title" in self.model_fields_set:
            assert self.title is not None
            update_data["title"] = self.title

        if "description" in self.model_fields_set:
            update_data["description"] = self.description

        if "exercises" in self.model_fields_set:
            assert self.exercises is not None
            update_data["exercises"] = self.exercises

        return update_data


class WorkoutTemplateResponse(BaseModel):
    id: UUID
    created_by_user_id: UUID | None
    title: str
    description: str | None
    is_favorite: bool
    exercises: list[WorkoutTemplateExerciseResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)