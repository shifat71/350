from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator
from src.database.chromadb_client import collection
from src.database.redis_client import get_cache, set_cache
from src.utils.logger import get_logger

logger = get_logger(__name__)

class RecommendationConfig(BaseModel):
    """Configuration for product recommendations."""
    n_results: int = Field(default=10, ge=1, le=50)
    min_score: float = Field(default=0.5, ge=0.0, le=1.0)
    cache_ttl: int = Field(default=3600, ge=60, le=86400)  # 1 hour default

    @validator('n_results')
    def validate_n_results(cls, v: int) -> int:
        """Validate n_results field."""
        if v < 1 or v > 50:
            raise ValueError("n_results must be between 1 and 50")
        return v

class ProductRecommendation(BaseModel):
    """Model for a product recommendation."""
    id: int  # Changed from str to int to match backend
    name: str
    description: str
    price: float
    image: str  # Changed from image_url to image to match backend
    category_name: str
    score: float

    @validator('price')
    def validate_price(cls, v: float) -> float:
        """Validate price field."""
        if v < 0.0:
            raise ValueError("price must be non-negative")
        return v

    @validator('score')
    def validate_score(cls, v: float) -> float:
        """Validate score field."""
        if v < 0.0 or v > 1.0:
            raise ValueError("score must be between 0.0 and 1.0")
        return v

class RecommendationAgent:
    """Agent for recommending similar products."""

    def __init__(
        self,
        config: Optional[RecommendationConfig] = None,
    ):
        """
        Initialize the recommendation agent.
        
        Args:
            config: Optional configuration for recommendations
        """
        self.config = config or RecommendationConfig()

    async def recommend(
        self,
        product_id: str,
        n_results: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Get product recommendations based on similarity.
        
        Args:
            product_id: ID of the product to get recommendations for
            n_results: Optional override for number of results
            
        Returns:
            Dict containing recommendations and metadata
            
        Raises:
            ValueError: If the product ID is invalid
            Exception: For other errors during processing
        """
        if not product_id or not isinstance(product_id, str):
            raise ValueError("product_id must be a non-empty string")
        
        try:
            # Update config if n_results is provided
            if n_results is not None:
                self.config.n_results = n_results

            # Check cache first
            cache_key = f"recommend:{product_id}:{self.config.n_results}"
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
                n_results=self.config.n_results + 1,  # +1 to account for self
            )

            recommendations = []
            for id_, meta, dist in zip(
                results["ids"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                # Skip the product itself
                if id_ == product_id:
                    continue

                # Calculate similarity score
                score = 1.0 - dist

                # Skip if score is below threshold
                if score < self.config.min_score:
                    continue

                # Create recommendation
                recommendation = ProductRecommendation(
                    id=id_,
                    name=meta.get("name", ""),
                    description=meta.get("description", ""),
                    price=float(meta.get("price", 0.0)),
                    image_url=meta.get("image_url", ""),
                    category_name=meta.get("category_name", ""),
                    score=score,
                )
                recommendations.append(recommendation.dict())

                # Stop if we have enough recommendations
                if len(recommendations) >= self.config.n_results:
                    break

            result = {
                "recommendations": recommendations,
                "total": len(recommendations),
            }

            # Cache the results
            await set_cache(cache_key, result, ttl=self.config.cache_ttl)

            logger.info(
                "Generated recommendations",
                product_id=product_id,
                n_recommendations=len(recommendations),
            )
            return result
        except Exception as e:
            logger.error("Error generating recommendations", error=str(e))
            raise 