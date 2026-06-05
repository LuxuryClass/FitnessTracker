from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ALLOWED_PRIMARY_MUSCLE_GROUPS: frozenset[str] = frozenset(
    {"chest", "back", "legs", "shoulders", "arms", "core", "cardio"}
)


def _normalize_string_list(values: list[str], field_label: str) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()

    for raw in values:
        cleaned = raw.strip().lower()
        if not cleaned:
            raise ValueError(f"{field_label} не может содержать пустые значения.")
        if cleaned in seen:
            raise ValueError(f"{field_label} не должен содержать дубли.")
        seen.add(cleaned)
        normalized.append(cleaned)

    return normalized


def _normalize_case_preserving_list(values: list[str], field_label: str, max_item_length: int) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()

    for raw in values:
        cleaned = raw.strip()
        if not cleaned:
            raise ValueError(f"{field_label} не может содержать пустые значения.")
        if len(cleaned) > max_item_length:
            raise ValueError(f"Элемент {field_label} не может быть длиннее {max_item_length} символов.")
        key = cleaned.lower()
        if key in seen:
            raise ValueError(f"{field_label} не должен содержать дубли.")
        seen.add(key)
        normalized.append(cleaned)

    return normalized


def _validate_primary_groups(values: list[str]) -> list[str]:
    normalized = _normalize_string_list(values, "primary_muscle_groups")
    invalid = [v for v in normalized if v not in ALLOWED_PRIMARY_MUSCLE_GROUPS]
    if invalid:
        raise ValueError(
            "primary_muscle_groups содержит недопустимые значения: "
            f"{invalid}. Допустимы: {sorted(ALLOWED_PRIMARY_MUSCLE_GROUPS)}."
        )
    return normalized


class ExerciseCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    primary_muscle_groups: list[str] = Field(default_factory=list, max_length=10)
    secondary_muscles: list[str] = Field(default_factory=list, max_length=30)
    equipment: list[str] = Field(default_factory=list, max_length=20)

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
    def validate_equipment(cls, value: list[str] | None) -> list[str]:
        if value is None:
            raise ValueError("equipment не может быть null.")
        return _normalize_case_preserving_list(value, "equipment", max_item_length=120)

    @field_validator("primary_muscle_groups")
    @classmethod
    def validate_primary_muscle_groups(cls, value: list[str]) -> list[str]:
        return _validate_primary_groups(value)

    @field_validator("secondary_muscles")
    @classmethod
    def validate_secondary_muscles(cls, value: list[str]) -> list[str]:
        return _normalize_case_preserving_list(value, "secondary_muscles", max_item_length=50)


class ExerciseUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    primary_muscle_groups: list[str] | None = Field(default=None, max_length=10)
    secondary_muscles: list[str] | None = Field(default=None, max_length=30)
    equipment: list[str] | None = Field(default=None, max_length=20)

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
    def validate_equipment(cls, value: list[str] | None) -> list[str]:
        if value is None:
            raise ValueError("equipment не может быть null.")
        return _normalize_case_preserving_list(value, "equipment", max_item_length=120)

    @field_validator("primary_muscle_groups")
    @classmethod
    def validate_primary_muscle_groups(cls, value: list[str] | None) -> list[str]:
        if value is None:
            raise ValueError("primary_muscle_groups не может быть null.")
        return _validate_primary_groups(value)

    @field_validator("secondary_muscles")
    @classmethod
    def validate_secondary_muscles(cls, value: list[str] | None) -> list[str]:
        if value is None:
            raise ValueError("secondary_muscles не может быть null.")
        return _normalize_case_preserving_list(value, "secondary_muscles", max_item_length=50)

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

        if "primary_muscle_groups" in self.model_fields_set:
            assert self.primary_muscle_groups is not None
            update_data["primary_muscle_groups"] = self.primary_muscle_groups

        if "secondary_muscles" in self.model_fields_set:
            assert self.secondary_muscles is not None
            update_data["secondary_muscles"] = self.secondary_muscles

        if "equipment" in self.model_fields_set:
            update_data["equipment"] = self.equipment

        return update_data


class ExerciseMediaItem(BaseModel):
    id: UUID
    url: str
    type: str

    model_config = ConfigDict(from_attributes=True)


class ExerciseResponse(BaseModel):
    id: UUID
    created_by_user_id: UUID | None
    name: str
    description: str | None
    primary_muscle_groups: list[str]
    secondary_muscles: list[str]
    equipment: list[str]
    media: list[ExerciseMediaItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
