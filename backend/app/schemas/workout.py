from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class WorkoutExerciseCreateItem(BaseModel):
    exercise_id: UUID


class WorkoutExerciseResponse(BaseModel):
    exercise_id: UUID
    order_index: int = Field(ge=1)


class WorkoutCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    is_planned: bool
    planned_for: datetime | None = None
    description: str | None = Field(default=None, max_length=2000)
    exercises: list[WorkoutExerciseCreateItem] = Field(min_length=1, max_length=100)

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

    @field_validator("exercises")
    @classmethod
    def validate_exercises(cls, value: list[WorkoutExerciseCreateItem]) -> list[WorkoutExerciseCreateItem]:
        seen: set[UUID] = set()
        for item in value:
            if item.exercise_id in seen:
                raise ValueError("Упражнения в тренировке не должны повторяться.")
            seen.add(item.exercise_id)
        return value

    @model_validator(mode="after")
    def validate_planning_fields(self) -> "WorkoutCreateRequest":
        if self.is_planned and self.planned_for is None:
            raise ValueError("Для запланированной тренировки поле planned_for обязательно.")
        if not self.is_planned and self.planned_for is not None:
            raise ValueError("Для тренировки «сейчас» поле planned_for должно быть null.")
        return self


class WorkoutUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    is_planned: bool | None = None
    planned_for: datetime | None = None
    description: str | None = Field(default=None, max_length=2000)
    exercises: list[WorkoutExerciseCreateItem] | None = Field(default=None, min_length=1, max_length=100)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("title не может быть null.")
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

    @field_validator("exercises")
    @classmethod
    def validate_exercises(cls, value: list[WorkoutExerciseCreateItem] | None) -> list[WorkoutExerciseCreateItem]:
        if value is None:
            raise ValueError("exercises не может быть null.")

        seen: set[UUID] = set()
        for item in value:
            if item.exercise_id in seen:
                raise ValueError("Упражнения в тренировке не должны повторяться.")
            seen.add(item.exercise_id)
        return value

    @model_validator(mode="after")
    def validate_payload(self) -> "WorkoutUpdateRequest":
        if not self.model_fields_set:
            raise ValueError("Нужно передать хотя бы одно поле для обновления тренировки.")
        return self

    def to_update_dict(
        self,
    ) -> dict[str, str | bool | datetime | list[WorkoutExerciseCreateItem] | None]:
        update_data: dict[str, str | bool | datetime | list[WorkoutExerciseCreateItem] | None] = {}

        if "title" in self.model_fields_set:
            assert self.title is not None
            update_data["title"] = self.title

        if "is_planned" in self.model_fields_set:
            assert self.is_planned is not None
            update_data["is_planned"] = self.is_planned

        if "planned_for" in self.model_fields_set:
            update_data["planned_for"] = self.planned_for

        if "description" in self.model_fields_set:
            update_data["description"] = self.description

        if "exercises" in self.model_fields_set:
            assert self.exercises is not None
            update_data["exercises"] = self.exercises

        return update_data


class WorkoutResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    is_planned: bool
    planned_for: datetime | None
    description: str | None
    exercises: list[WorkoutExerciseResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
