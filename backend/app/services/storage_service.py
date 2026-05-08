from __future__ import annotations

import inspect
from pathlib import Path
from urllib.parse import urlparse
from uuid import UUID, uuid4

import aioboto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import BadRequestException

MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
AVATAR_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7  # 7 дней


class StorageService:
    @staticmethod
    def _is_configured() -> bool:
        required_values = (
            settings.aws_endpoint_url,
            settings.aws_default_region,
            settings.aws_s3_bucket_name,
            settings.aws_access_key_id,
            settings.aws_secret_access_key,
        )
        return all(bool(value) for value in required_values)

    @staticmethod
    def _ensure_configured() -> None:
        if not StorageService._is_configured():
            raise BadRequestException("Хранилище аватаров не настроено в Railway Variables.")

    @staticmethod
    def _build_avatar_object_key(user_id: UUID, filename: str | None) -> str:
        extension = Path(filename or "").suffix.lower()
        if not extension:
            extension = ".jpg"
        return f"avatars/{user_id}/{uuid4().hex}{extension}"

    @staticmethod
    def _extract_object_key(stored_avatar_value: str) -> str:
        normalized = stored_avatar_value.strip()
        if not normalized:
            return ""

        if normalized.startswith("http://") or normalized.startswith("https://"):
            parsed = urlparse(normalized)
            key = parsed.path.lstrip("/")
            bucket_prefix = f"{settings.aws_s3_bucket_name}/" if settings.aws_s3_bucket_name else ""
            if bucket_prefix and key.startswith(bucket_prefix):
                return key[len(bucket_prefix) :]
            return key

        return normalized.lstrip("/")

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
                )
        except (ClientError, BotoCoreError) as exc:
            raise BadRequestException("Не удалось загрузить аватарку в хранилище.") from exc

        return object_key

    async def delete_avatar(self, stored_avatar_value: str | None, *, ignore_missing: bool = False) -> None:
        self._ensure_configured()
        if not stored_avatar_value:
            return

        object_key = self._extract_object_key(stored_avatar_value)
        if not object_key:
            return

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
                await s3_client.delete_object(
                    Bucket=settings.aws_s3_bucket_name,
                    Key=object_key,
                )
        except ClientError as exc:
            error_code = str(exc.response.get("Error", {}).get("Code", ""))
            if ignore_missing and error_code in {"NoSuchKey", "404", "NotFound"}:
                return
            raise BadRequestException("Не удалось удалить старую аватарку из хранилища.") from exc
        except BotoCoreError as exc:
            raise BadRequestException("Не удалось удалить старую аватарку из хранилища.") from exc

    async def build_avatar_access_url(self, stored_avatar_value: str | None) -> str | None:
        if not stored_avatar_value:
            return None
        if not self._is_configured():
            return None

        object_key = self._extract_object_key(stored_avatar_value)
        if not object_key:
            return None

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
                presigned_url = s3_client.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={
                        "Bucket": settings.aws_s3_bucket_name,
                        "Key": object_key,
                    },
                    ExpiresIn=AVATAR_URL_EXPIRES_SECONDS,
                )
                if inspect.isawaitable(presigned_url):
                    presigned_url = await presigned_url
        except (ClientError, BotoCoreError) as exc:
            raise BadRequestException("Не удалось сформировать ссылку для аватарки.") from exc

        return str(presigned_url)


storage_service = StorageService()
