from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateRequest
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Пользователи"])


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return await user_service.get_me(current_user)


@router.patch("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_me(
    payload: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return await user_service.update_me(
        db=db,
        current_user=current_user,
        payload=payload,
    )
