from typing import Dict, List
from src.database.chromadb_client import collection
from src.database.redis_client import get_cache, set_cache
from src.utils.logger import get_logger

logger = get_logger(__name__)

class RecommendationAgent:
    """Agent for recommending similar products."""
    def __init__(self, n_results: int = 10):
        self.n_results = n_results

    async def recommend(self, product_id: str) -> Dict:
        cache_key = f"recommend:{product_id}:{self.n_results}"
        cached = await get_cache(cache_key)
        if cached:
            logger.info("Returning cached recommendations", product_id=product_id)
            return cached
        # Get the embedding for the product
        product = collection.get(ids=[product_id])
        if not product["embeddings"] or not product["embeddings"][0]:
            logger.error("No embedding found for product", product_id=product_id)
            return {"recommendations": [], "total": 0}
        embedding = product["embeddings"][0]
        # Find similar products (excluding itself)
        results = collection.query(
            query_embeddings=[embedding],
            n_results=self.n_results + 1,
        )
        recommendations = []
        for id_, meta, dist in zip(
            results["ids"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            if id_ == product_id:
                continue
            recommendations.append({
                "id": id_,
                "name": meta.get("name", ""),
                "description": meta.get("description", ""),
                "price": meta.get("price", 0.0),
                "image_url": meta.get("image_url", ""),
                "category_name": meta.get("category_name", ""),
                "score": 1.0 - dist,
            })
            if len(recommendations) >= self.n_results:
                break
        result = {"recommendations": recommendations, "total": len(recommendations)}
        await set_cache(cache_key, result)
        return result 