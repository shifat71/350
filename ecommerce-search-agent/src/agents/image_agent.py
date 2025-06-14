import os
from dotenv import load_dotenv
load_dotenv()
import base64
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field, validator
import openai
from src.utils.logger import get_logger
from src.agents.search_agent import SearchAgent
from langchain.tools import Tool
from src.database.chromadb_client import search_similar_products

logger = get_logger(__name__)

class ImageSearchConfig(BaseModel):
    """Configuration for image search."""
    limit: int = Field(default=5, ge=1, le=20)
    min_confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=256, ge=64, le=512)

    @validator('limit')
    def validate_limit(cls, v: int) -> int:
        """Validate limit field."""
        if v < 1 or v > 20:
            raise ValueError("limit must be between 1 and 20")
        return v

# Create tools for the search agent
search_tools = [
    Tool(
        name="vector_search",
        description="Search for similar products using vector similarity",
        func=search_similar_products,
    ),
]

class ImageAgent:
    """Agent for handling image+text search queries."""

    def __init__(
        self,
        model_name: str = "gpt-4-vision-preview",
        config: Optional[ImageSearchConfig] = None,
    ):
        """
        Initialize the image agent.
        
        Args:
            model_name: Name of the OpenAI model to use
            config: Optional configuration for image search
        """
        self.model_name = model_name
        self.config = config or ImageSearchConfig()
        self.search_agent = SearchAgent(tools=search_tools)
        self.openai_client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    async def extract_image_features(
        self,
        image_base64: str,
        prompt: Optional[str] = None,
    ) -> str:
        """
        Use OpenAI Vision API to extract features from the image.
        
        Args:
            image_base64: Base64-encoded image data
            prompt: Optional prompt to guide feature extraction
            
        Returns:
            Extracted image features as text
            
        Raises:
            ValueError: If the image data is invalid
            Exception: For other errors during processing
        """
        if not image_base64 or not isinstance(image_base64, str):
            raise ValueError("image_base64 must be a non-empty string")
        
        try:
            # Validate base64 data
            try:
                base64.b64decode(image_base64)
            except Exception:
                raise ValueError("Invalid base64 image data")

            # OpenAI Vision API expects the image as a base64-encoded string in a data URL
            response = await self.openai_client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at describing e-commerce product images for search. Focus on key visual features, style, and product attributes that would help in finding similar products."
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt or "Describe the product in this image for e-commerce search. Include key features, style, and attributes."
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:image/png;base64,{image_base64}"}
                            },
                        ],
                    },
                ],
                max_tokens=self.config.max_tokens,
                temperature=0.1,  # Lower temperature for more consistent results
            )
            
            description = response.choices[0].message.content
            logger.info(
                "Extracted image features",
                description=description,
                prompt=prompt,
            )
            return description
        except Exception as e:
            logger.error("Error extracting image features", error=str(e))
            raise

    async def search(
        self,
        image_base64: str,
        query: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> Dict:
        """
        Perform image+text search.
        
        Args:
            image_base64: Base64-encoded image data
            query: Optional text query to combine with image features
            limit: Optional override for result limit
            
        Returns:
            Dict containing search results and metadata
            
        Raises:
            ValueError: If the inputs are invalid
            Exception: For other errors during processing
        """
        if not image_base64 or not isinstance(image_base64, str):
            raise ValueError("image_base64 must be a non-empty string")
        
        try:
            # Update config if limit is provided
            if limit is not None:
                self.config.limit = limit

            # Step 1: Extract features from image
            image_features = await self.extract_image_features(image_base64, prompt=query)
            
            # Step 2: Combine with text (if any)
            combined_query = f"{query or ''} {image_features}".strip()
            
            # Step 3: Use the search agent
            results = await self.search_agent.search(
                combined_query,
                limit=self.config.limit,
            )
            
            logger.info(
                "Image search completed",
                query=query,
                image_features=image_features,
                results_count=len(results.get("products", [])),
            )
            return results
        except Exception as e:
            logger.error("Error in image search", error=str(e))
            raise 