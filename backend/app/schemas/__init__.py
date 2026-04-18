"""Пакет Pydantic-схем."""

from app.schemas.auth import AuthResponse, LoginRequest, LogoutResponse, RefreshRequest, RegisterRequest, TokenPairResponse
from app.schemas.exercise import ExerciseCreateRequest, ExerciseResponse, ExerciseUpdateRequest
from app.schemas.user import UserResponse, UserUpdateRequest
from app.schemas.workout import (
    WorkoutCreateRequest,
    WorkoutExerciseCreateItem,
    WorkoutExerciseResponse,
    WorkoutResponse,
    WorkoutUpdateRequest,
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
    "ExerciseCreateRequest",
    "ExerciseUpdateRequest",
    "ExerciseResponse",
    "WorkoutCreateRequest",
    "WorkoutUpdateRequest",
    "WorkoutExerciseCreateItem",
    "WorkoutExerciseResponse",
    "WorkoutResponse",
]
