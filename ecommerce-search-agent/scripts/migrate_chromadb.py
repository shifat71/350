#!/usr/bin/env python3
"""
Migration script to update ChromaDB embeddings to use backend product IDs.
This script fetches products from the backend database and updates ChromaDB accordingly.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

from database.models import Product, Category
from database.chromadb_client import collection, add_product_embedding, chroma_client
from utils.logger import get_logger

# Load environment variables
load_dotenv()

logger = get_logger(__name__)

# Use the same DATABASE_URL as backend
DATABASE_URL = (
    os.environ.get("DATABASE_URL") or 
    f"postgresql+asyncpg://{os.environ.get('POSTGRES_USER', 'ecommerce_user')}:{os.environ.get('POSTGRES_PASSWORD', 'ecommerce_password')}@{os.environ.get('POSTGRES_HOST', 'localhost')}:{os.environ.get('POSTGRES_PORT', '5433')}/{os.environ.get('POSTGRES_DB', 'ecommerce_db')}"
)

async def clear_chromadb():
    """Clear existing ChromaDB collection."""
    try:
        # Delete the collection and recreate it
        chroma_client.delete_collection("products")
        logger.info("Cleared existing ChromaDB collection")
        
        # Recreate the collection
        from src.database.chromadb_client import openai_ef
        collection = chroma_client.get_or_create_collection(
            name="products",
            embedding_function=openai_ef,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("Recreated ChromaDB collection")
        
    except Exception as e:
        logger.warning(f"Error clearing ChromaDB collection: {e}")

async def migrate_product_embeddings():
    """Migrate product embeddings from backend database to ChromaDB."""
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        # Get all products with their categories
        result = await session.execute(
            select(Product).join(Category)
        )
        products = result.scalars().all()
        
        if not products:
            logger.warning("No products found in database")
            return
        
        logger.info(f"Migrating {len(products)} products to ChromaDB...")
        
        batch_size = 10
        for i in range(0, len(products), batch_size):
            batch = products[i:i + batch_size]
            
            # Prepare batch data for ChromaDB
            ids = []
            documents = []
            metadatas = []
            
            for product in batch:
                try:
                    # Use string ID for ChromaDB (convert integer to string)
                    product_id = str(product.id)
                    
                    # Create text for embedding from product details
                    embedding_text = f"{product.name} {product.description or ''} {' '.join(product.features or [])} {product.category.name}"
                    
                    # Create metadata
                    metadata = {
                        "name": product.name,
                        "category": product.category.name,
                        "price": product.price,
                        "rating": product.rating,
                        "in_stock": product.inStock,
                        "features": product.features or [],
                        "backend_id": product.id  # Store the backend integer ID
                    }
                    
                    ids.append(product_id)
                    documents.append(embedding_text)
                    metadatas.append(metadata)
                    
                except Exception as e:
                    logger.error(f"Error preparing product {product.name} for ChromaDB: {e}")
                    continue
            
            if ids:
                try:
                    # Add batch to ChromaDB
                    collection.add(
                        ids=ids,
                        documents=documents,
                        metadatas=metadatas,
                    )
                    logger.info(f"Added batch of {len(ids)} products to ChromaDB")
                    
                except Exception as e:
                    logger.error(f"Error adding batch to ChromaDB: {e}")
                    continue
        
        logger.info("Migration to ChromaDB completed successfully")
    
    await engine.dispose()

async def verify_migration():
    """Verify the ChromaDB migration."""
    try:
        # Test a simple search
        results = collection.query(
            query_texts=["wireless headphones"],
            n_results=3,
        )
        
        logger.info(f"Verification search returned {len(results['ids'][0])} results")
        
        for i, (id_, doc, meta) in enumerate(zip(
            results["ids"][0],
            results["documents"][0], 
            results["metadatas"][0]
        )):
            logger.info(f"  {i+1}. ID: {id_}, Name: {meta.get('name', 'N/A')}, Category: {meta.get('category', 'N/A')}")
        
        # Get collection stats
        collection_count = collection.count()
        logger.info(f"Total products in ChromaDB: {collection_count}")
        
    except Exception as e:
        logger.error(f"Error during verification: {e}")

async def main():
    """Main function to migrate ChromaDB data."""
    try:
        logger.info("Starting ChromaDB migration...")
        
        # Step 1: Clear existing ChromaDB data
        await clear_chromadb()
        
        # Step 2: Migrate product embeddings
        await migrate_product_embeddings()
        
        # Step 3: Verify migration
        await verify_migration()
        
        logger.info("ChromaDB migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during ChromaDB migration: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
