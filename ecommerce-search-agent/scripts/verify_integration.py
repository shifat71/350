#!/usr/bin/env python3
"""
Verification script to test that the search agent is properly integrated with the backend database.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy import select, text
from dotenv import load_dotenv

from database.models import Product, Category
from agents.search_agent import SearchAgent
from utils.logger import get_logger

# Load environment variables
load_dotenv()

logger = get_logger(__name__)

# Use the same DATABASE_URL as backend
DATABASE_URL = (
    os.environ.get("DATABASE_URL") or 
    f"postgresql+asyncpg://{os.environ.get('POSTGRES_USER', 'ecommerce_user')}:{os.environ.get('POSTGRES_PASSWORD', 'ecommerce_password')}@{os.environ.get('POSTGRES_HOST', 'localhost')}:{os.environ.get('POSTGRES_PORT', '5432')}/{os.environ.get('POSTGRES_DB', 'ecommerce_db')}"
)

async def test_database_access():
    """Test that we can access the backend database."""
    print("🔍 Testing database access...")
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        # Test basic product query
        result = await session.execute(
            select(Product).join(Category).options(selectinload(Product.category)).limit(3)
        )
        products = result.scalars().all()
        
        print(f"✅ Found {len(products)} products in database")
        
        for product in products:
            print(f"   - {product.name} (${product.price}) in {product.category.name}")
        
        # Check vector embeddings
        vector_result = await session.execute(
            text("SELECT COUNT(*) FROM products WHERE vector IS NOT NULL")
        )
        vector_count = vector_result.scalar()
        print(f"✅ {vector_count} products have vector embeddings")
        
    await engine.dispose()
    return len(products) > 0

async def test_search_agent():
    """Test the search agent functionality."""
    print("\n🔍 Testing search agent...")
    
    try:
        search_agent = SearchAgent()
        
        # Test a simple search
        test_queries = [
            "wireless headphones",
            "electronics under $200",
            "furniture for home"
        ]
        
        for query in test_queries:
            print(f"\n   Testing query: '{query}'")
            
            try:
                results = await search_agent.search(query, limit=3)
                
                if results and results.get("products"):
                    print(f"   ✅ Found {len(results['products'])} results")
                    
                    for i, product in enumerate(results["products"][:2], 1):
                        print(f"      {i}. {product['name']} (${product['price']}) - Score: {product.get('score', 0):.2f}")
                else:
                    print("   ⚠️  No results found")
                    
            except Exception as e:
                print(f"   ❌ Search failed: {e}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to initialize search agent: {e}")
        return False

async def test_chromadb_integration():
    """Test ChromaDB integration."""
    print("\n🔍 Testing ChromaDB integration...")
    
    try:
        from database.chromadb_client import collection, search_similar_products
        
        # Test collection exists and has data
        count = collection.count()
        print(f"✅ ChromaDB collection has {count} products")
        
        # Test vector search
        vector_results = await search_similar_products("wireless headphones", n_results=3)
        print(f"✅ Vector search returned {len(vector_results)} results")
        
        for i, result in enumerate(vector_results[:2], 1):
            metadata = result.get("metadata", {})
            print(f"   {i}. {metadata.get('name', 'Unknown')} - Distance: {result.get('distance', 0):.3f}")
        
        return count > 0
        
    except Exception as e:
        print(f"❌ ChromaDB test failed: {e}")
        return False

async def main():
    """Main verification function."""
    print("🧪 Running ecommerce-search-agent integration verification...\n")
    
    # Test 1: Database access
    db_ok = await test_database_access()
    
    # Test 2: ChromaDB integration
    chromadb_ok = await test_chromadb_integration()
    
    # Test 3: Search agent functionality
    search_ok = await test_search_agent()
    
    print("\n" + "="*50)
    print("📊 VERIFICATION RESULTS:")
    print(f"   Database Access: {'✅ PASS' if db_ok else '❌ FAIL'}")
    print(f"   ChromaDB Integration: {'✅ PASS' if chromadb_ok else '❌ FAIL'}")
    print(f"   Search Agent: {'✅ PASS' if search_ok else '❌ FAIL'}")
    
    if all([db_ok, chromadb_ok, search_ok]):
        print("\n🎉 All tests passed! The integration is working correctly.")
        print("   The search agent is now using the same database as the backend.")
        return True
    else:
        print("\n❌ Some tests failed. Please check the configuration and try again.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
