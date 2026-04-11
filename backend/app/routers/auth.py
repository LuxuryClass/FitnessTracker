from fastapi import APIRouter, Depends, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.security import get_bearer_token, get_current_user
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, LogoutResponse, RefreshRequest, RegisterRequest, TokenPairResponse
from app.schemas.user import UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Авторизация"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    return await auth_service.register(db, payload)


@router.post("/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> AuthResponse:
    return await auth_service.login(db, payload)


@router.post("/refresh", response_model=TokenPairResponse, status_code=status.HTTP_200_OK)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenPairResponse:
    return await auth_service.refresh(db, payload)


@router.post("/logout", response_model=LogoutResponse, status_code=status.HTTP_200_OK)
async def logout(
    access_token: str = Depends(get_bearer_token),
    redis: Redis = Depends(get_redis),
) -> LogoutResponse:
    return await auth_service.logout(redis=redis, access_token=access_token)


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)
