import json
from typing import Any, Optional, List
import os
from dotenv import load_dotenv
from redis.asyncio import Redis
from redis.asyncio.client import Redis as RedisClient
from redis.exceptions import RedisError

from src.utils.logger import get_logger

load_dotenv()

logger = get_logger(__name__)

def get_required_env_var(name: str, default: Optional[str] = None) -> str:
    """Get a required environment variable or raise an error."""
    value = os.environ.get(name, default)
    if value is None:
        raise ValueError(f"Required environment variable {name} is not set")
    return value

# Initialize Redis client
try:
    redis_client: RedisClient = Redis(
        host=get_required_env_var("REDIS_HOST", "localhost"),
        port=int(get_required_env_var("REDIS_PORT", "6379")),
        db=int(get_required_env_var("REDIS_DB", "0")),
        decode_responses=True,
    )
except (ValueError, redis.RedisError) as e:
    logger.error("Failed to initialize Redis client", error=str(e))
    raise

async def get_cache(key: str) -> Optional[Any]:
    """Get a value from cache."""
    if not key or not isinstance(key, str):
        raise ValueError("key must be a non-empty string")

    try:
        value = await redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except RedisError as e:
        logger.error("Error getting cache", error=str(e), key=key)
        return None
    except json.JSONDecodeError as e:
        logger.error("Error decoding cached value", error=str(e), key=key)
        return None

async def set_cache(
    key: str,
    value: Any,
    ttl: Optional[int] = None,
) -> None:
    """Set a value in cache with optional TTL."""
    if not key or not isinstance(key, str):
        raise ValueError("key must be a non-empty string")
    if ttl is not None and (not isinstance(ttl, int) or ttl < 0):
        raise ValueError("ttl must be a non-negative integer or None")

    try:
        ttl = ttl or int(get_required_env_var("CACHE_TTL", "300"))
        await redis_client.set(
            key,
            json.dumps(value),
            ex=ttl,
        )
        logger.debug("Cache set successfully", key=key)
    except RedisError as e:
        logger.error("Error setting cache", error=str(e), key=key)
    except json.JSONDecodeError as e:
        logger.error("Error encoding value for cache", error=str(e), key=key)

async def delete_cache(key: str) -> None:
    """Delete a value from cache."""
    if not key or not isinstance(key, str):
        raise ValueError("key must be a non-empty string")

    try:
        await redis_client.delete(key)
        logger.debug("Cache deleted successfully", key=key)
    except RedisError as e:
        logger.error("Error deleting cache", error=str(e), key=key)

async def clear_cache(pattern: str = "*") -> None:
    """Clear all cache entries matching the pattern."""
    if not isinstance(pattern, str):
        raise ValueError("pattern must be a string")

    try:
        keys: List[str] = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
        logger.info("Cache cleared successfully", pattern=pattern)
    except RedisError as e:
        logger.error("Error clearing cache", error=str(e), pattern=pattern) 