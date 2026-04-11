from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
