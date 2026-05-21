from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.core.exceptions import NotFoundException
from app.schemas.notifications import (
    NotificationSettings,
    NotificationSettingsUpdateRequest,
    PushSubscriptionDeleteRequest,
    PushSubscriptionRequest,
)
from app.schemas.user import RecentProgressResponse, UserResponse, UserUpdateRequest
from app.services import notification_service, user_service
from app.services.user_progress_service import user_progress_service
from app.services.storage_service import storage_service

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
    background_tasks: BackgroundTasks,
    avatar: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    user_response, old_avatar_to_delete = await user_service.upload_avatar(db=db, current_user=current_user, file=avatar)
    if old_avatar_to_delete:
        background_tasks.add_task(storage_service.delete_avatar, old_avatar_to_delete, ignore_missing=True)
    return user_response


@router.get("/me/recent-progress", response_model=list[RecentProgressResponse], status_code=status.HTTP_200_OK)
async def get_recent_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecentProgressResponse]:
    return await user_progress_service.get_recent_progress(db=db, current_user=current_user)


@router.get("/me/notifications", response_model=NotificationSettings, status_code=status.HTTP_200_OK)
async def get_notification_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationSettings:
    return await notification_service.get_settings(db=db, current_user=current_user)


@router.patch("/me/notifications", response_model=NotificationSettings, status_code=status.HTTP_200_OK)
async def update_notification_settings(
    payload: NotificationSettingsUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationSettings:
    return await notification_service.update_settings(db=db, current_user=current_user, payload=payload)


@router.post("/me/notifications/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def upsert_push_subscription(
    payload: PushSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await notification_service.upsert_subscription(db=db, current_user=current_user, payload=payload)


@router.delete("/me/notifications/subscriptions", status_code=status.HTTP_204_NO_CONTENT)
async def delete_push_subscription(
    payload: PushSubscriptionDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    deleted = await notification_service.delete_subscription(
        db=db,
        current_user=current_user,
        endpoint=payload.endpoint,
    )
    if not deleted:
        raise NotFoundException("Подписка не найдена.")
