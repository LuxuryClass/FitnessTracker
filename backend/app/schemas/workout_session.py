from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

WorkoutSessionStatus = Literal["in_progress", "completed", "cancelled"]


class WorkoutSessionStartRequest(BaseModel):
    workout_id: UUID


class WorkoutSessionSetUpsertRequest(BaseModel):
    exercise_id: UUID
    client_event_id: UUID
    set_index: int = Field(ge=1)
    weight_kg: Decimal = Field(ge=0)
    reps: int = Field(ge=1)


class WorkoutSessionSetResponse(BaseModel):
    id: UUID
    session_id: UUID
    exercise_id: UUID
    client_event_id: UUID
    set_index: int
    weight_kg: Decimal
    reps: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkoutSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    workout_id: UUID
    status: WorkoutSessionStatus
    started_at: datetime
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    sets: list[WorkoutSessionSetResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
