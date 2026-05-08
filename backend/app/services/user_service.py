from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from fastapi import UploadFile

from app.core.exceptions import AlreadyExistsException, BadRequestException
from app.models.user import User
from app.repositories import user_repository
from app.schemas.user import UserResponse, UserUpdateRequest
from app.services.user_metrics_service import build_user_response
from app.services.storage_service import storage_service


class UserService:
    async def get_me(self, db: AsyncSession, current_user: User) -> UserResponse:
        return await build_user_response(db=db, user=current_user)

    async def update_me(
        self,
        db: AsyncSession,
        current_user: User,
        payload: UserUpdateRequest,
    ) -> UserResponse:
        update_data = payload.to_update_dict()

        if "email" in update_data and update_data["email"] != current_user.email:
            existing_user_by_email = await user_repository.get_by_email(db, update_data["email"])
            if existing_user_by_email is not None and existing_user_by_email.id != current_user.id:
                raise AlreadyExistsException("Пользователь с таким email уже существует.")

        if "username" in update_data and update_data["username"] != current_user.username:
            existing_user_by_username = await user_repository.get_by_username(db, update_data["username"])
            if existing_user_by_username is not None and existing_user_by_username.id != current_user.id:
                raise AlreadyExistsException("Пользователь с таким username уже существует.")

        user = await user_repository.update(
            db=db,
            user=current_user,
            email=update_data.get("email"),
            username=update_data.get("username"),
        )
        await db.commit()
        await db.refresh(user)
        return await build_user_response(db=db, user=user)

    async def upload_avatar(self, db: AsyncSession, current_user: User, file: UploadFile) -> UserResponse:
        old_avatar_value = current_user.avatar_url
        avatar_key = await storage_service.upload_user_avatar(user_id=current_user.id, file=file)
        try:
            if old_avatar_value and old_avatar_value != avatar_key:
                await storage_service.delete_avatar(old_avatar_value, ignore_missing=True)

            user = await user_repository.update_avatar_url(db=db, user=current_user, avatar_url=avatar_key)
            await db.commit()
            await db.refresh(user)
            return await build_user_response(db=db, user=user)
        except (BadRequestException, SQLAlchemyError):
            await db.rollback()
            await storage_service.delete_avatar(avatar_key, ignore_missing=True)
            raise


user_service = UserService()
