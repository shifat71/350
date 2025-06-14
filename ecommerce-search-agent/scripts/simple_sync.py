#!/usr/bin/env python3
"""
Simple sync script to populate ChromaDB with backend product data.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import asyncpg
from dotenv import load_dotenv
import chromadb
from chromadb.config import Settings
from openai import OpenAI

from utils.logger import get_logger

# Load environment variables
load_dotenv()

logger = get_logger(__name__)

# Database configuration
DATABASE_URL = f"postgresql://{os.environ.get('POSTGRES_USER', 'ecommerce_user')}:{os.environ.get('POSTGRES_PASSWORD', 'ecommerce_password')}@{os.environ.get('POSTGRES_HOST', 'localhost')}:{os.environ.get('POSTGRES_PORT', '5433')}/{os.environ.get('POSTGRES_DB', 'ecommerce_db')}"

# ChromaDB client (using persistent storage)
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# OpenAI client
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

async def get_backend_products():
    """Get all products from the backend database."""
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        products = await conn.fetch("""
            SELECT p.id, p.name, p.description, p.price, p."originalPrice", 
                   p.image, p.images, p."inStock", p."categoryId",
                   c.name as category_name
            FROM products p
            JOIN categories c ON p."categoryId" = c.id
        """)
        
        return [dict(product) for product in products]
    finally:
        await conn.close()

def generate_embedding(text):
    """Generate embedding for text using OpenAI."""
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        return None

def sync_products_to_chromadb(products):
    """Sync products to ChromaDB."""
    try:
        # Get or create collection
        collection = chroma_client.get_or_create_collection(
            name="products",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Clear existing data
        try:
            collection.delete(where={})
            logger.info("Cleared existing ChromaDB data")
        except:
            pass
        
        # Prepare data for ChromaDB
        documents = []
        metadatas = []
        ids = []
        embeddings = []
        
        for product in products:
            # Create document text for embedding
            doc_text = f"{product['name']} {product['description']} {product['category_name']}"
            
            # Generate embedding
            embedding = generate_embedding(doc_text)
            if embedding is None:
                logger.warning(f"Skipping product {product['id']} due to embedding error")
                continue
            
            documents.append(doc_text)
            metadatas.append({
                "backend_id": product['id'],
                "name": product['name'],
                "description": product['description'] or '',
                "price": float(product['price']),
                "originalPrice": float(product['originalPrice']) if product['originalPrice'] else 0.0,
                "image": product['image'] or '',
                "images": ','.join(product['images']) if product['images'] else '',
                "inStock": bool(product['inStock']),
                "categoryId": product['categoryId'],
                "category_name": product['category_name'] or ''
            })
            ids.append(str(product['id']))
            embeddings.append(embedding)
        
        # Add to ChromaDB
        if documents:
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids,
                embeddings=embeddings
            )
            logger.info(f"Added {len(documents)} products to ChromaDB")
        else:
            logger.warning("No products to add to ChromaDB")
            
    except Exception as e:
        logger.error(f"Error syncing to ChromaDB: {e}")
        raise

async def main():
    """Main sync function."""
    try:
        logger.info("Starting simple backend data sync...")
        
        # Get products from backend
        products = await get_backend_products()
        logger.info(f"Found {len(products)} products in backend")
        
        if not products:
            logger.warning("No products found in backend database")
            return
        
        # Sync to ChromaDB
        sync_products_to_chromadb(products)
        
        logger.info("Simple backend data sync completed successfully!")
        
    except Exception as e:
        logger.error(f"Sync failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == "__main__":
    asyncio.run(main())
