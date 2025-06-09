import json
from typing import Any, Optional
import os
from dotenv import load_dotenv

import redis.asyncio as redis
from redis.asyncio import Redis

from src.utils.logger import get_logger

load_dotenv()

logger = get_logger(__name__)

# Initialize Redis client
redis_client: Redis = redis.Redis(
    host=os.environ.get("REDIS_HOST", "localhost"),
    port=int(os.environ.get("REDIS_PORT", 6379)),
    db=int(os.environ.get("REDIS_DB", 0)),
    decode_responses=True,
)


async def get_cache(key: str) -> Optional[Any]:
    """Get a value from cache."""
    try:
        value = await redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        logger.error("Error getting cache", error=str(e), key=key)
        return None


async def set_cache(
    key: str,
    value: Any,
    ttl: Optional[int] = None,
) -> None:
    """Set a value in cache with optional TTL."""
    try:
        await redis_client.set(
            key,
            json.dumps(value),
            ex=ttl or int(os.environ.get("CACHE_TTL", 300)),
        )
        logger.debug("Cache set successfully", key=key)
    except Exception as e:
        logger.error("Error setting cache", error=str(e), key=key)


async def delete_cache(key: str) -> None:
    """Delete a value from cache."""
    try:
        await redis_client.delete(key)
        logger.debug("Cache deleted successfully", key=key)
    except Exception as e:
        logger.error("Error deleting cache", error=str(e), key=key)


async def clear_cache(pattern: str = "*") -> None:
    """Clear all cache entries matching the pattern."""
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
        logger.info("Cache cleared successfully", pattern=pattern)
    except Exception as e:
        logger.error("Error clearing cache", error=str(e), pattern=pattern) 