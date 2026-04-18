from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ExerciseCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    muscle_groups: list[str] = Field(min_length=1, max_length=20)
    equipment: str = Field(min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Название упражнения не может быть пустым.")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("equipment")
    @classmethod
    def validate_equipment(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("equipment не может быть null.")
        normalized = value.strip()
        if not normalized:
            raise ValueError("equipment не может быть пустым.")
        return normalized

    @field_validator("muscle_groups")
    @classmethod
    def validate_muscle_groups(cls, value: list[str]) -> list[str]:
        normalized_groups: list[str] = []
        seen: set[str] = set()

        for raw_group in value:
            normalized = raw_group.strip().lower()
            if not normalized:
                raise ValueError("muscle_groups не может содержать пустые значения.")
            if normalized in seen:
                raise ValueError("muscle_groups не должен содержать дубли.")
            seen.add(normalized)
            normalized_groups.append(normalized)

        return normalized_groups


class ExerciseUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    muscle_groups: list[str] | None = Field(default=None, min_length=1, max_length=20)
    equipment: str | None = Field(default=None, max_length=120)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("name не может быть null.")
        normalized = value.strip()
        if not normalized:
            raise ValueError("Название упражнения не может быть пустым.")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("equipment")
    @classmethod
    def validate_equipment(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("equipment не может быть null.")
        normalized = value.strip()
        if not normalized:
            raise ValueError("equipment не может быть пустым.")
        return normalized

    @field_validator("muscle_groups")
    @classmethod
    def validate_muscle_groups(cls, value: list[str] | None) -> list[str]:
        if value is None:
            raise ValueError("muscle_groups не может быть null.")

        normalized_groups: list[str] = []
        seen: set[str] = set()

        for raw_group in value:
            normalized = raw_group.strip().lower()
            if not normalized:
                raise ValueError("muscle_groups не может содержать пустые значения.")
            if normalized in seen:
                raise ValueError("muscle_groups не должен содержать дубли.")
            seen.add(normalized)
            normalized_groups.append(normalized)

        return normalized_groups

    @model_validator(mode="after")
    def validate_payload(self) -> "ExerciseUpdateRequest":
        if not self.model_fields_set:
            raise ValueError("Нужно передать хотя бы одно поле для обновления упражнения.")
        return self

    def to_update_dict(self) -> dict[str, str | list[str] | None]:
        update_data: dict[str, str | list[str] | None] = {}

        if "name" in self.model_fields_set:
            assert self.name is not None
            update_data["name"] = self.name

        if "description" in self.model_fields_set:
            update_data["description"] = self.description

        if "muscle_groups" in self.model_fields_set:
            assert self.muscle_groups is not None
            update_data["muscle_groups"] = self.muscle_groups

        if "equipment" in self.model_fields_set:
            update_data["equipment"] = self.equipment

        return update_data


class ExerciseResponse(BaseModel):
    id: UUID
    created_by_user_id: UUID | None
    name: str
    description: str | None
    muscle_groups: list[str]
    equipment: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
