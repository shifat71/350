#!/usr/bin/env python3
"""
Sync script for ecommerce search agent using the backend's database.
This script connects to the same PostgreSQL database as the backend and syncs
vector embeddings for existing products.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select
from dotenv import load_dotenv

from database.models import Base, Product, Category
from embeddings.indexer import index_product
from utils.logger import get_logger

# Load environment variables
load_dotenv()

logger = get_logger(__name__)

# Use PostgreSQL URL format for sync script
DATABASE_URL = f"postgresql://{os.environ.get('POSTGRES_USER', 'ecommerce_user')}:{os.environ.get('POSTGRES_PASSWORD', 'ecommerce_password')}@{os.environ.get('POSTGRES_HOST', 'localhost')}:{os.environ.get('POSTGRES_PORT', '5433')}/{os.environ.get('POSTGRES_DB', 'ecommerce_db')}"

# Also create async engine URL for async operations
ASYNC_DATABASE_URL = f"postgresql+asyncpg://{os.environ.get('POSTGRES_USER', 'ecommerce_user')}:{os.environ.get('POSTGRES_PASSWORD', 'ecommerce_password')}@{os.environ.get('POSTGRES_HOST', 'localhost')}:{os.environ.get('POSTGRES_PORT', '5433')}/{os.environ.get('POSTGRES_DB', 'ecommerce_db')}"

async def add_vector_column_if_not_exists():
    """Add vector column to products table if it doesn't exist."""
    engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        # Check if vector column exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'vector'
        """))
        
        vector_exists = result.fetchone() is not None
        
        if not vector_exists:
            logger.info("Adding vector column to products table...")
            await conn.execute(text("""
                ALTER TABLE products ADD COLUMN vector FLOAT[];
            """))
            logger.info("Vector column added successfully")
        else:
            logger.info("Vector column already exists")
    
    await engine.dispose()

async def sync_products_to_chromadb():
    """Sync all products from PostgreSQL to ChromaDB with embeddings."""
    engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get all products with their categories
        stmt = select(Product, Category).join(Category, Product.categoryId == Category.id)
        result = await session.execute(stmt)
        products_with_categories = result.all()
        
        logger.info(f"Found {len(products_with_categories)} products to sync")
        
        for product, category in products_with_categories:
            product_data = {
                "id": product.id,
                "name": product.name,
                "description": product.description,
                "price": product.price,
                "originalPrice": product.originalPrice,
                "image": product.image,
                "images": product.images,
                "rating": product.rating,
                "reviews": product.reviews,
                "inStock": product.inStock,
                "stock": product.stock,
                "features": product.features,
                "specifications": product.specifications,
                "category_name": category.name,
            }
            
            try:
                await index_product(product_data)
                logger.info(f"Synced product {product.id}: {product.name}")
            except Exception as e:
                logger.error(f"Failed to sync product {product.id}: {str(e)}")
    
    await engine.dispose()

async def main():
    """Main sync function."""
    try:
        logger.info("Starting backend data sync...")
        
        # Step 1: Add vector column if needed
        await add_vector_column_if_not_exists()
        
        # Step 2: Sync products to ChromaDB
        await sync_products_to_chromadb()
        
        logger.info("Backend data sync completed successfully!")
        
    except Exception as e:
        logger.error(f"Sync failed: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
