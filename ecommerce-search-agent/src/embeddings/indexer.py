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
        "backend_id": product["id"],  # Store the backend integer ID
        "name": product["name"],
        "description": product.get("description", ""),
        "price": product.get("price", 0.0),
        "image": product.get("image", ""),
        "rating": product.get("rating", 0),
        "reviews": product.get("reviews", 0),
        "in_stock": product.get("inStock", True),
        "stock": product.get("stock", 0),
        "features": str(product.get("features", [])),  # Convert list to string
        "specifications": str(product.get("specifications", {})),  # Convert JSON to string
        "category": product.get("category_name", ""),
    }
    try:
        collection.add(
            ids=[str(product["id"])],  # Use string ID for ChromaDB
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