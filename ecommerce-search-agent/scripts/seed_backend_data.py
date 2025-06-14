#!/usr/bin/env python3
"""
Seed script for ecommerce search agent using the same data as backend.
This script connects to the same database as the backend and adds vector embeddings
to the existing products for search functionality.
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
from embeddings.generator import generate_embedding
from utils.logger import get_logger

# Load environment variables
load_dotenv()

logger = get_logger(__name__)

# Use the same DATABASE_URL as backend
DATABASE_URL = (
    os.environ.get("DATABASE_URL") or 
    f"postgresql+asyncpg://{os.environ.get('POSTGRES_USER', 'ecommerce_user')}:{os.environ.get('POSTGRES_PASSWORD', 'ecommerce_password')}@{os.environ.get('POSTGRES_HOST', 'localhost')}:{os.environ.get('POSTGRES_PORT', '5433')}/{os.environ.get('POSTGRES_DB', 'ecommerce_db')}"
)

async def check_and_add_vector_column():
    """Add vector column to products table if it doesn't exist."""
    engine = create_async_engine(DATABASE_URL, echo=True)
    
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
            # Skip pgvector extension for now, just use FLOAT[]
            # await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            
            # Add vector column as FLOAT[] array
            await conn.execute(text("ALTER TABLE products ADD COLUMN vector FLOAT[]"))
            logger.info("Vector column added successfully")
        else:
            logger.info("Vector column already exists")
    
    await engine.dispose()

async def generate_product_embeddings():
    """Generate embeddings for all products in the database."""
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        # Get all products
        result = await session.execute(
            select(Product).join(Category)
        )
        products = result.scalars().all()
        
        if not products:
            logger.warning("No products found in database")
            return
        
        logger.info(f"Generating embeddings for {len(products)} products...")
        
        for product in products:
            try:
                # Create text for embedding from product details
                embedding_text = f"{product.name} {product.description or ''} {' '.join(product.features or [])} {product.category.name}"
                
                # Generate embedding
                embedding = await generate_embedding(embedding_text)
                
                # Update product with embedding
                product.embedding = embedding
                session.add(product)
                
                logger.info(f"Generated embedding for product: {product.name}")
                
            except Exception as e:
                logger.error(f"Error generating embedding for product {product.name}: {e}")
                continue
        
        await session.commit()
        logger.info("All product embeddings generated successfully")
    
    await engine.dispose()

async def verify_data_sync():
    """Verify that the search agent can access the backend's data."""
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        # Count products and categories
        product_count = await session.execute(text("SELECT COUNT(*) FROM products"))
        category_count = await session.execute(text("SELECT COUNT(*) FROM categories"))
        
        products_total = product_count.scalar()
        categories_total = category_count.scalar()
        
        logger.info(f"Database verification:")
        logger.info(f"  - Categories: {categories_total}")
        logger.info(f"  - Products: {products_total}")
        
        # Get a sample product with its category
        result = await session.execute(
            text("""
                SELECT p.id, p.name, p.price, c.name as category_name 
                FROM products p 
                JOIN categories c ON p."categoryId" = c.id 
                LIMIT 1
            """)
        )
        sample = result.fetchone()
        
        if sample:
            logger.info(f"  - Sample product: {sample.name} (${sample.price}) in {sample.category_name}")
        
        # Check if vector column has data
        vector_count = await session.execute(text("SELECT COUNT(*) FROM products WHERE vector IS NOT NULL"))
        vectors_total = vector_count.scalar()
        logger.info(f"  - Products with embeddings: {vectors_total}")
    
    await engine.dispose()

async def main():
    """Main function to set up the search agent database."""
    try:
        logger.info("Starting database setup for ecommerce search agent...")
        
        # Step 1: Check and add vector column
        await check_and_add_vector_column()
        
        # Step 2: Verify data sync
        await verify_data_sync()
        
        # Step 3: Generate embeddings for products
        await generate_product_embeddings()
        
        # Step 4: Final verification
        await verify_data_sync()
        
        logger.info("Database setup completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during database setup: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
