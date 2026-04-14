"""Пакет Pydantic-схем."""

from app.schemas.auth import AuthResponse, LoginRequest, LogoutResponse, RefreshRequest, RegisterRequest, TokenPairResponse
from app.schemas.user import UserResponse
from app.schemas.workout import WorkoutCreateRequest, WorkoutResponse

__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "RefreshRequest",
    "TokenPairResponse",
    "AuthResponse",
    "LogoutResponse",
    "UserResponse",
    "WorkoutCreateRequest",
    "WorkoutResponse",
]
