"""
Юнит-тесты для core/redis.py.
Проверяем добавление в чёрный список и проверку наличия.
"""

import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone
from app.core.redis import add_token_to_blacklist, is_token_blacklisted, _build_blacklist_key
from app.core.exceptions import BadRequestException

@pytest.mark.asyncio
async def test_add_token_to_blacklist_success(mock_redis):
    jti = "test-jti"
    exp = int(datetime.now(timezone.utc).timestamp()) + 3600  # 1 час
    await add_token_to_blacklist(mock_redis, jti, exp)
    mock_redis.set.assert_awaited_once()
    args, kwargs = mock_redis.set.call_args
    assert args[0] == _build_blacklist_key(jti)
    assert args[1] == "1"
    # ttl должен быть положительным и <= 3600
    ttl = kwargs["ex"]
    assert ttl > 0 and ttl <= 3600

@pytest.mark.asyncio
async def test_add_token_to_blacklist_expired_token_raises():
    mock_redis = AsyncMock()
    with pytest.raises(BadRequestException, match="время жизни"):
        await add_token_to_blacklist(mock_redis, "jti", 0)

@pytest.mark.asyncio
async def test_is_token_blacklisted_true(mock_redis):
    mock_redis.exists = AsyncMock(return_value=1)
    result = await is_token_blacklisted(mock_redis, "blacklisted-jti")
    assert result is True

@pytest.mark.asyncio
async def test_is_token_blacklisted_false(mock_redis):
    mock_redis.exists = AsyncMock(return_value=0)
    result = await is_token_blacklisted(mock_redis, "clean-jti")
    assert result is False

def test_build_blacklist_key_invalid_jti_raises():
    with pytest.raises(BadRequestException):
        _build_blacklist_key("")