from fastapi import APIRouter, HTTPException, status, Depends
from src.api.models import TextSearchRequest, ImageSearchRequest, SearchResponse
from src.agents.search_agent import SearchAgent
from src.agents.image_agent import ImageAgent
from src.utils.logger import get_logger
from src.utils.validators import validate_base64_image
from langchain.tools import Tool
from src.database.chromadb_client import search_similar_products
from src.database.postgres import get_db
from sqlalchemy import select
from src.database.models import Product

router = APIRouter()
logger = get_logger(__name__)

def safe_database_search(query: str):
    """Safely search products in the database using SQLAlchemy."""
    db = get_db()
    search_query = select(Product).where(
        Product.name.ilike(f"%{query}%") | 
        Product.description.ilike(f"%{query}%")
    )
    return db.execute(search_query).scalars().all()

# Create tools for the search agent
search_tools = [
    Tool(
        name="vector_search",
        description="Search for similar products using vector similarity",
        func=search_similar_products,
    ),
    Tool(
        name="database_search",
        description="Search for products in the database using safe SQLAlchemy queries",
        func=safe_database_search,
    ),
]

# Instantiate agents
search_agent = SearchAgent(tools=search_tools)
image_agent = ImageAgent()

@router.post("/text", response_model=SearchResponse)
async def text_search(request: TextSearchRequest):
    try:
        result = await search_agent.search(request.query, limit=request.limit)
        return SearchResponse(**result)
    except Exception as e:
        logger.error("Text search failed", error=str(e))
        raise HTTPException(status_code=500, detail="Search failed")

@router.post("/image", response_model=SearchResponse)
async def image_search(request: ImageSearchRequest):
    try:
        validate_base64_image(request.image_base64)
        result = await image_agent.search(request.image_base64, request.query, limit=request.limit)
        return SearchResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Image search failed", error=str(e))
        raise HTTPException(status_code=500, detail="Image search failed") 