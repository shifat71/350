import asyncio
from src.database.postgres import get_db
from src.database.models import Product, Category
from src.embeddings.indexer import index_products
from src.utils.logger import configure_logging, get_logger
from sqlalchemy import text

logger = get_logger(__name__)

async def fetch_all_products():
    async with get_db() as db:
        query = text("""
            SELECT p.id, p.name, p.description, p.price, p.image, c.name as category_name
            FROM products p
            JOIN categories c ON p."categoryId" = c.id
        """)
        result = await db.execute(query)
        products = [dict(row._mapping) for row in result.fetchall()]
        return products

async def main():
    configure_logging()
    logger.info("Starting embedding rebuild process")
    products = await fetch_all_products()
    logger.info(f"Fetched {len(products)} products from database")
    await index_products(products)
    logger.info("Rebuilt all product embeddings successfully")

if __name__ == "__main__":
    asyncio.run(main()) 