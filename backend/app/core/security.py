from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import UnauthorizedException
from app.core.redis import get_redis, is_token_blacklisted
from app.models.user import User
from app.repositories import user_repository


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def _validate_non_empty(value: str, field_name: str) -> None:
    if not value or not value.strip():
        raise ValueError(f"{field_name} не может быть пустым.")


def hash_password(plain_password: str) -> str:
    _validate_non_empty(plain_password, "Пароль")
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    _validate_non_empty(plain_password, "Пароль")
    _validate_non_empty(password_hash, "Хеш пароля")
    return pwd_context.verify(plain_password, password_hash)


def _create_token(user_id: UUID, token_type: str, expires_delta: timedelta) -> str:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + expires_delta
    payload = {
        "sub": str(user_id),
        "type": token_type,
        "jti": str(uuid4()),
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: UUID) -> str:
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    return _create_token(user_id=user_id, token_type=ACCESS_TOKEN_TYPE, expires_delta=expires_delta)


def create_refresh_token(user_id: UUID) -> str:
    expires_delta = timedelta(days=settings.refresh_token_expire_days)
    return _create_token(user_id=user_id, token_type=REFRESH_TOKEN_TYPE, expires_delta=expires_delta)


def create_token_pair(user_id: UUID) -> tuple[str, str]:
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    return access_token, refresh_token


def _require_payload_field(payload: dict[str, object], field_name: str) -> object:
    value = payload.get(field_name)
    if value is None:
        raise UnauthorizedException(f"Некорректный payload токена: отсутствует {field_name}.")
    return value


def get_token_subject(payload: dict[str, object]) -> str:
    subject = _require_payload_field(payload, "sub")
    if not isinstance(subject, str) or not subject.strip():
        raise UnauthorizedException("Некорректный payload токена: поле sub должно быть непустой строкой.")
    return subject


def get_token_type(payload: dict[str, object]) -> str:
    token_type = _require_payload_field(payload, "type")
    if not isinstance(token_type, str) or token_type not in {ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE}:
        raise UnauthorizedException("Некорректный payload токена: неизвестный тип токена.")
    return token_type


def get_token_jti(payload: dict[str, object]) -> str:
    token_jti = _require_payload_field(payload, "jti")
    if not isinstance(token_jti, str) or not token_jti.strip():
        raise UnauthorizedException("Некорректный payload токена: отсутствует jti.")
    return token_jti


def get_token_exp(payload: dict[str, object]) -> int:
    token_exp = _require_payload_field(payload, "exp")
    if not isinstance(token_exp, (int, float)) or int(token_exp) <= 0:
        raise UnauthorizedException("Некорректный payload токена: поле exp задано неверно.")
    return int(token_exp)


def ensure_token_type(payload: dict[str, object], expected_token_type: str) -> None:
    actual_type = get_token_type(payload)
    if actual_type != expected_token_type:
        raise UnauthorizedException("Передан токен неверного типа.")


def decode_jwt_token(token: str) -> dict[str, object]:
    _validate_non_empty(token, "JWT токен")
    try:
        payload: dict[str, object] = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except JWTError as exc:
        raise UnauthorizedException("Невалидный или просроченный токен.") from exc

    # Прогоняем обязательные поля сразу, чтобы downstream-код работал только с валидным payload.
    get_token_subject(payload)
    get_token_type(payload)
    get_token_jti(payload)
    get_token_exp(payload)
    return payload


async def get_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise UnauthorizedException("Не передан Bearer токен.")

    token = credentials.credentials.strip()
    if not token:
        raise UnauthorizedException("Не передан Bearer токен.")
    return token


async def get_current_user(
    token: str = Depends(get_bearer_token),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> User:
    payload = decode_jwt_token(token)
    ensure_token_type(payload, ACCESS_TOKEN_TYPE)

    token_jti = get_token_jti(payload)
    if await is_token_blacklisted(redis, token_jti):
        raise UnauthorizedException("Токен отозван. Выполните вход заново.")

    subject = get_token_subject(payload)
    try:
        user_id = UUID(subject)
    except ValueError as exc:
        raise UnauthorizedException("Некорректный payload токена: поле sub должно быть UUID.") from exc

    user = await user_repository.get_by_id(db, user_id)
    if user is None:
        raise UnauthorizedException("Пользователь по токену не найден.")

    if not user.is_active:
        raise UnauthorizedException("Пользователь деактивирован.")

    return user
