#!/usr/bin/env python3
"""
Check database connection for the integration setup.
"""

import os
import asyncio
import asyncpg
from dotenv import load_dotenv

async def check_db():
    """Check if we can connect to the backend database."""
    load_dotenv()
    
    try:
        user = os.environ.get("POSTGRES_USER", "ecommerce_user")
        password = os.environ.get("POSTGRES_PASSWORD", "ecommerce_password")
        host = os.environ.get("POSTGRES_HOST", "localhost")
        port = os.environ.get("POSTGRES_PORT", "5433")
        db = os.environ.get("POSTGRES_DB", "ecommerce_db")
        
        DATABASE_URL = f'postgresql://{user}:{password}@{host}:{port}/{db}'
        
        conn = await asyncpg.connect(DATABASE_URL)
        result = await conn.fetchval('SELECT COUNT(*) FROM products')
        await conn.close()
        
        print(f'✅ Connected to backend database. Found {result} products.')
        return result > 0
    except Exception as e:
        print(f'❌ Could not connect to backend database: {e}')
        print('   Make sure the backend database is running and accessible.')
        return False

if __name__ == "__main__":
    has_products = asyncio.run(check_db())
    exit(0 if has_products else 1)
