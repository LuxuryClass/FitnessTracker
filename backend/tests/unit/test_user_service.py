import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from uuid import uuid4
from fastapi import UploadFile
from sqlalchemy.exc import SQLAlchemyError

from app.services.user_service import user_service
from app.schemas.user import UserUpdateRequest
from app.core.exceptions import AlreadyExistsException, BadRequestException

@pytest.mark.asyncio
async def test_get_me_success(mock_db_session, mock_user):
    """
    Получение своего профиля. build_user_response мокается, возвращая не None.
    Проверяется, что build_user_response вызван с db и user.
    """
    with patch("app.services.user_service.build_user_response", new=AsyncMock()) as mock_build:
        mock_build.return_value = MagicMock()
        result = await user_service.get_me(db=mock_db_session, current_user=mock_user)
    assert result is not None
    mock_build.assert_awaited_once_with(db=mock_db_session, user=mock_user)

@pytest.mark.asyncio
async def test_update_me_email_conflict(mock_db_session, mock_user):
    """
    Обновление email на уже занятый → AlreadyExistsException.
    """
    payload = UserUpdateRequest(email="other@example.com")
    other_user = MagicMock()
    other_user.id = uuid4()
    with patch("app.services.user_service.user_repository") as repo:
        repo.get_by_email = AsyncMock(return_value=other_user)
        with pytest.raises(AlreadyExistsException):
            await user_service.update_me(db=mock_db_session, current_user=mock_user, payload=payload)

@pytest.mark.asyncio
async def test_upload_avatar_success(mock_db_session, mock_user):
    """
    Успешная загрузка аватара: хранилище возвращает ключ, БД обновляется.
    Старый аватар отсутствует, поэтому delete_avatar не вызывается.
    """
    file = MagicMock(spec=UploadFile)
    file.filename = "pic.jpg"
    file.content_type = "image/jpeg"
    file.read = AsyncMock(return_value=b"fake_image_data")

    with patch("app.services.user_service.storage_service") as storage:
        storage.upload_user_avatar = AsyncMock(return_value="avatars/userid/newkey.jpg")
        storage.build_avatar_access_url = AsyncMock(return_value="http://presigned.url")
        storage.delete_avatar = AsyncMock()
        with patch("app.services.user_service.user_repository") as repo:
            repo.update_avatar_url = AsyncMock(return_value=mock_user)
            with patch("app.services.user_service.build_user_response", new=AsyncMock()) as build:
                build.return_value = MagicMock()
                result = await user_service.upload_avatar(
                    db=mock_db_session, current_user=mock_user, file=file
                )
    user_response, old_avatar_to_delete = result
    assert user_response is not None
    assert old_avatar_to_delete is None
    storage.upload_user_avatar.assert_awaited_once()
    storage.delete_avatar.assert_not_called()

@pytest.mark.asyncio
async def test_upload_avatar_rollback_on_storage_error(mock_db_session, mock_user):
    """
    Ошибка БД после загрузки в S3 → транзакция откатывается, новый аватар удаляется.
    """
    file = MagicMock(spec=UploadFile)
    file.filename = "pic.jpg"
    file.content_type = "image/jpeg"
    file.read = AsyncMock(return_value=b"data")

    with patch("app.services.user_service.storage_service") as storage:
        storage.upload_user_avatar = AsyncMock(return_value="avatars/temp.jpg")
        storage.delete_avatar = AsyncMock()
        with patch("app.services.user_service.user_repository") as repo:
            repo.update_avatar_url = AsyncMock(side_effect=SQLAlchemyError())
            with pytest.raises(SQLAlchemyError):
                await user_service.upload_avatar(
                    db=mock_db_session, current_user=mock_user, file=file
                )
    storage.delete_avatar.assert_awaited_once_with("avatars/temp.jpg", ignore_missing=True)
    mock_db_session.rollback.assert_awaited_once()
