from __future__ import annotations

from pathlib import Path
from urllib.parse import quote, urlparse
from uuid import UUID, uuid4

import aioboto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import BadRequestException

MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024


class StorageService:
    @staticmethod
    def _ensure_configured() -> None:
        required_values = (
            settings.aws_endpoint_url,
            settings.aws_default_region,
            settings.aws_s3_bucket_name,
            settings.aws_access_key_id,
            settings.aws_secret_access_key,
        )
        if any(not value for value in required_values):
            raise BadRequestException("Хранилище аватаров не настроено в Railway Variables.")

    @staticmethod
    def _build_public_url(object_key: str) -> str:
        if settings.aws_endpoint_url is None or settings.aws_s3_bucket_name is None:
            raise BadRequestException("Хранилище аватаров не настроено в Railway Variables.")

        parsed_endpoint = urlparse(settings.aws_endpoint_url)
        if not parsed_endpoint.scheme or not parsed_endpoint.netloc:
            raise BadRequestException("Некорректный AWS_ENDPOINT_URL.")

        encoded_key = quote(object_key, safe="/")
        return f"{parsed_endpoint.scheme}://{settings.aws_s3_bucket_name}.{parsed_endpoint.netloc}/{encoded_key}"

    @staticmethod
    def _build_avatar_object_key(user_id: UUID, filename: str | None) -> str:
        extension = Path(filename or "").suffix.lower()
        if not extension:
            extension = ".jpg"
        return f"avatars/{user_id}/{uuid4().hex}{extension}"

    async def upload_user_avatar(self, user_id: UUID, file: UploadFile) -> str:
        self._ensure_configured()

        if not file.content_type or not file.content_type.startswith("image/"):
            raise BadRequestException("Разрешены только изображения (image/*).")

        file_content = await file.read()
        if not file_content:
            raise BadRequestException("Файл аватарки пустой.")

        if len(file_content) > MAX_AVATAR_SIZE_BYTES:
            raise BadRequestException("Размер аватарки не должен превышать 5 MB.")

        object_key = self._build_avatar_object_key(user_id=user_id, filename=file.filename)

        session = aioboto3.Session()
        try:
            async with session.client(
                "s3",
                endpoint_url=settings.aws_endpoint_url,
                region_name=settings.aws_default_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
            ) as s3_client:
                await s3_client.put_object(
                    Bucket=settings.aws_s3_bucket_name,
                    Key=object_key,
                    Body=file_content,
                    ContentType=file.content_type,
                    ACL="public-read",
                )
        except (ClientError, BotoCoreError) as exc:
            raise BadRequestException("Не удалось загрузить аватарку в хранилище.") from exc

        return self._build_public_url(object_key)


storage_service = StorageService()
