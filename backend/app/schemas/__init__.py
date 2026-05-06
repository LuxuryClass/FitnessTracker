"""Пакет Pydantic-схем."""

from app.schemas.auth import AuthResponse, LoginRequest, LogoutResponse, RefreshRequest, RegisterRequest, TokenPairResponse
from app.schemas.exercise import ExerciseCreateRequest, ExerciseResponse, ExerciseUpdateRequest
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
    "RefreshRequest",
    "TokenPairResponse",
    "AuthResponse",
    "LogoutResponse",
    "UserResponse",
    "UserUpdateRequest",
    "WeeklySessionsProgress",
    "ExerciseCreateRequest",
    "ExerciseUpdateRequest",
    "ExerciseResponse",
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
