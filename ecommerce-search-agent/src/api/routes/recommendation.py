from fastapi import APIRouter, HTTPException
from src.api.models import RecommendationResponse
from src.agents.recommendation_agent import RecommendationAgent
from src.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)

# Instantiate recommendation agent
recommendation_agent = RecommendationAgent()

@router.get("/{product_id}", response_model=RecommendationResponse)
async def get_recommendations(product_id: str):
    try:
        result = await recommendation_agent.recommend(product_id)
        return RecommendationResponse(**result)
    except Exception as e:
        logger.error("Recommendation failed", error=str(e))
        raise HTTPException(status_code=500, detail="Recommendation failed") 