from datetime import datetime, timezone

from redis.asyncio import Redis

from app.core.config import settings
from app.core.exceptions import BadRequestException


TOKEN_BLACKLIST_PREFIX = "auth:blacklist"


def _build_blacklist_key(token_jti: str) -> str:
    normalized_jti = token_jti.strip()
    if not normalized_jti:
        raise BadRequestException("Некорректный jti токена для blacklist.")
    return f"{TOKEN_BLACKLIST_PREFIX}:{normalized_jti}"


redis_client = Redis.from_url(settings.redis_url, decode_responses=True)


async def get_redis() -> Redis:
    return redis_client


async def add_token_to_blacklist(redis: Redis, token_jti: str, token_exp: int) -> None:
    if token_exp <= 0:
        raise BadRequestException("Некорректное время жизни токена.")

    now_timestamp = int(datetime.now(timezone.utc).timestamp())
    ttl_seconds = max(token_exp - now_timestamp, 1)
    await redis.set(_build_blacklist_key(token_jti), "1", ex=ttl_seconds)


async def is_token_blacklisted(redis: Redis, token_jti: str) -> bool:
    exists = await redis.exists(_build_blacklist_key(token_jti))
    return exists > 0


async def close_redis_connection() -> None:
    await redis_client.aclose()
