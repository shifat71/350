import os
from dotenv import load_dotenv
load_dotenv()
import base64
from typing import Optional, Dict
import openai
from src.utils.logger import get_logger
from src.agents.search_agent import SearchAgent
from langchain.tools import Tool
from src.database.chromadb_client import search_similar_products
from src.database.postgres import get_db

logger = get_logger(__name__)

# Create tools for the search agent
search_tools = [
    Tool(
        name="vector_search",
        description="Search for similar products using vector similarity",
        func=search_similar_products,
    ),
    Tool(
        name="database_search",
        description="Search for products in the database using SQL",
        func=lambda query: get_db().execute(query),
    ),
]

class ImageAgent:
    """Agent for handling image+text search queries."""
    def __init__(self, model_name: str = "gpt-4o-mini"):
        self.model_name = model_name
        self.search_agent = SearchAgent(tools=search_tools)
        self.openai_client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

    async def extract_image_features(self, image_base64: str, prompt: Optional[str] = None) -> str:
        """Use OpenAI Vision API to extract features from the image."""
        try:
            # OpenAI Vision API expects the image as a base64-encoded string in a data URL
            response = await self.openai_client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are an expert at describing e-commerce product images for search."},
                    {"role": "user", "content": [
                        {"type": "text", "text": prompt or "Describe the product in this image for e-commerce search."},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_base64}"}},
                    ]},
                ],
                max_tokens=256,
            )
            description = response.choices[0].message.content
            logger.info("Extracted image features", description=description)
            return description
        except Exception as e:
            logger.error("Error extracting image features", error=str(e))
            raise

    async def search(
        self,
        image_base64: str,
        query: Optional[str] = None,
        limit: int = 5,
    ) -> Dict:
        """Perform image+text search."""
        # Step 1: Extract features from image
        image_features = await self.extract_image_features(image_base64, prompt=query)
        # Step 2: Combine with text (if any)
        combined_query = f"{query or ''} {image_features}".strip()
        # Step 3: Use the search agent
        return await self.search_agent.search(combined_query, limit=limit) 