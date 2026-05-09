from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.user import RecentProgressResponse, UserResponse, UserUpdateRequest
from app.services import user_service
from app.services.user_progress_service import user_progress_service

router = APIRouter(prefix="/users", tags=["Пользователи"])


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return await user_service.get_me(db=db, current_user=current_user)


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


@router.post("/me/avatar", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def upload_avatar(
    avatar: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return await user_service.upload_avatar(db=db, current_user=current_user, file=avatar)


@router.get("/me/recent-progress", response_model=list[RecentProgressResponse], status_code=status.HTTP_200_OK)
async def get_recent_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecentProgressResponse]:
    return await user_progress_service.get_recent_progress(db=db, current_user=current_user)
