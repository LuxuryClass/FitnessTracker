from fastapi import APIRouter, Depends, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import UnauthorizedException
from app.core.redis import get_redis
from app.core.security import get_bearer_token
from app.schemas.auth import AccessTokenResponse, AuthResponse, LoginRequest, LogoutResponse, RegisterRequest
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Авторизация"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.auth_refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.auth_refresh_cookie_secure,
        samesite=settings.auth_refresh_cookie_samesite,
        domain=settings.auth_refresh_cookie_domain,
        path=settings.auth_refresh_cookie_path,
        max_age=settings.refresh_cookie_max_age_seconds,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_refresh_cookie_name,
        secure=settings.auth_refresh_cookie_secure,
        samesite=settings.auth_refresh_cookie_samesite,
        domain=settings.auth_refresh_cookie_domain,
        path=settings.auth_refresh_cookie_path,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    auth_response, refresh_token = await auth_service.register(db, payload)
    _set_refresh_cookie(response, refresh_token)
    return auth_response


@router.post("/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    auth_response, refresh_token = await auth_service.login(db, payload)
    _set_refresh_cookie(response, refresh_token)
    return auth_response


@router.post("/refresh", response_model=AccessTokenResponse, status_code=status.HTTP_200_OK)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AccessTokenResponse:
    refresh_token = request.cookies.get(settings.auth_refresh_cookie_name)
    if not refresh_token:
        raise UnauthorizedException("Refresh cookie отсутствует. Выполните вход заново.")
    token_response, new_refresh_token = await auth_service.refresh(db, refresh_token)
    _set_refresh_cookie(response, new_refresh_token)
    return token_response


@router.post("/logout", response_model=LogoutResponse, status_code=status.HTTP_200_OK)
async def logout(
    response: Response,
    access_token: str = Depends(get_bearer_token),
    redis: Redis = Depends(get_redis),
) -> LogoutResponse:
    logout_response = await auth_service.logout(redis=redis, access_token=access_token)
    _clear_refresh_cookie(response)
    return logout_response
