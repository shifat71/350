from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Path
from src.api.models import RecommendationResponse
from src.agents.recommendation_agent import RecommendationAgent
from src.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Instantiate recommendation agent
recommendation_agent = RecommendationAgent()

@router.get(
    "/{product_id}",
    response_model=RecommendationResponse,
    summary="Get product recommendations",
    description="Get personalized product recommendations based on a product ID",
    responses={
        200: {"description": "Successfully retrieved recommendations"},
        404: {"description": "Product not found"},
        500: {"description": "Internal server error"}
    }
)
async def get_recommendations(
    product_id: int = Path(..., description="The ID of the product to get recommendations for"),
    limit: Optional[int] = Query(
        default=5,
        ge=1,
        le=100,
        description="Number of recommendations to return"
    )
) -> RecommendationResponse:
    """
    Get product recommendations based on a product ID.
    
    Args:
        product_id: The UUID of the product to get recommendations for
        limit: Maximum number of recommendations to return (default: 5)
    
    Returns:
        RecommendationResponse containing the recommended products
        
    Raises:
        HTTPException: If the product is not found or an error occurs
    """
    try:
        result = await recommendation_agent.recommend(str(product_id), limit=limit)
        return RecommendationResponse(**result)
    except ValueError as e:
        logger.error("Invalid product ID", error=str(e), product_id=product_id)
        raise HTTPException(
            status_code=404,
            detail=f"Product not found: {str(e)}"
        )
    except Exception as e:
        logger.error("Recommendation failed", error=str(e), product_id=product_id)
        raise HTTPException(
            status_code=500,
            detail="Failed to generate recommendations"
        ) 