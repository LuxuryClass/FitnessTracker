"""Пакет Pydantic-схем."""

from app.schemas.auth import AccessTokenResponse, AuthResponse, LoginRequest, LogoutResponse, RegisterRequest
from app.schemas.exercise import ExerciseCreateRequest, ExerciseResponse, ExerciseUpdateRequest
from app.schemas.schedule import ScheduleWorkoutItem
from app.schemas.user import UserResponse, UserUpdateRequest, WeeklySessionsProgress
from app.schemas.workout import (
    WorkoutCreateRequest,
    WorkoutExerciseCreateItem,
    WorkoutExerciseResponse,
    WorkoutResponse,
    WorkoutUpdateRequest,
)
from app.schemas.workout_session import (
    WorkoutSessionResponse,
    WorkoutSessionSetResponse,
    WorkoutSessionSetUpsertRequest,
    WorkoutSessionStartRequest,
)

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "AccessTokenResponse",
    "AuthResponse",
    "LogoutResponse",
    "UserResponse",
    "UserUpdateRequest",
    "WeeklySessionsProgress",
    "ExerciseCreateRequest",
    "ExerciseUpdateRequest",
    "ExerciseResponse",
    "ScheduleWorkoutItem",
    "WorkoutCreateRequest",
    "WorkoutUpdateRequest",
    "WorkoutExerciseCreateItem",
    "WorkoutExerciseResponse",
    "WorkoutResponse",
    "WorkoutSessionStartRequest",
    "WorkoutSessionSetUpsertRequest",
    "WorkoutSessionSetResponse",
    "WorkoutSessionResponse",
]
