from typing import List, Dict, Any
from src.embeddings.generator import generate_embedding
from src.database.chromadb_client import collection
from src.utils.logger import get_logger

logger = get_logger(__name__)

async def index_product(product: Dict[str, Any]) -> None:
    """Generate and store embedding for a single product."""
    text = f"{product['name']} {product.get('description', '')}"
    embedding = await generate_embedding(text)
    metadata = {
        "name": product["name"],
        "description": product.get("description", ""),
        "price": product.get("price", 0.0),
        "image_url": product.get("image_url", ""),
        "category_name": product.get("category_name", ""),
    }
    try:
        collection.add(
            ids=[str(product["id"])],
            embeddings=[embedding],
            metadatas=[metadata],
            documents=[text],
        )
        logger.info("Indexed product in ChromaDB", product_id=product["id"])
    except Exception as e:
        logger.error("Error indexing product", error=str(e), product_id=product["id"])
        raise

async def index_products(products: List[Dict[str, Any]]) -> None:
    """Index a list of products in ChromaDB."""
    for product in products:
        await index_product(product) 