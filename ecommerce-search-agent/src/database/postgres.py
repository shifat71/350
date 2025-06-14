import os
from dotenv import load_dotenv
load_dotenv()
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.utils.logger import get_logger
from src.database.models import Base

logger = get_logger(__name__)

# Use the same DATABASE_URL as backend - priority order: env var, then constructed URL
DATABASE_URL = (
    os.environ.get("DATABASE_URL") or 
    f"postgresql+asyncpg://{os.environ.get('POSTGRES_USER', 'postgres')}:{os.environ.get('POSTGRES_PASSWORD', 'postgres')}@{os.environ.get('POSTGRES_HOST', 'localhost')}:{os.environ.get('POSTGRES_PORT', '5432')}/{os.environ.get('POSTGRES_DB', 'postgres')}"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
)

# Create async session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    """Initialize the database by creating all tables."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error("Error creating database tables", error=str(e))
        raise


@asynccontextmanager
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get a database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error("Database session error", error=str(e))
            raise
        finally:
            await session.close() 