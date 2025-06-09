from typing import Dict, List, Optional

from langchain.tools import BaseTool
from langchain_core.messages import BaseMessage

from src.agents.base_agent import BaseAgent
from src.chains.query_understanding import QueryUnderstandingChain
from src.chains.sql_generation import SQLGenerationChain
from src.database.chromadb_client import search_similar_products
from src.database.postgres import get_db
from src.database.redis_client import get_cache, set_cache
from src.utils.logger import get_logger
from sqlalchemy import text

logger = get_logger(__name__)

# System prompt for the search agent
SEARCH_AGENT_PROMPT = """You are an expert e-commerce search agent that helps users find products.
Your task is to understand user queries, search for relevant products, and provide helpful responses.

You have access to the following tools:
1. Query Understanding: Analyzes the user's query to extract key information
2. SQL Generation: Converts structured query understanding into SQL queries
3. Vector Search: Finds similar products using semantic search
4. Database Search: Executes SQL queries to find products

Follow these steps for each query:
1. Use Query Understanding to analyze the query
2. Generate SQL query based on the understanding
3. Execute the SQL query to find products
4. Use Vector Search to find similar products
5. Combine and rank the results
6. Provide a helpful response with product recommendations

Remember to:
- Consider both exact matches and semantic similarity
- Handle ambiguous queries by asking for clarification
- Provide relevant product details in the response
- Suggest related products when appropriate
- Explain your reasoning when necessary"""


class SearchAgent(BaseAgent):
    """Search agent for finding products based on user queries."""

    def __init__(
        self,
        tools: List[BaseTool],
        model_name: str = "gpt-4-turbo-preview",
    ):
        """Initialize the search agent."""
        super().__init__(tools, SEARCH_AGENT_PROMPT, model_name)
        self.query_understanding = QueryUnderstandingChain(model_name)
        self.sql_generation = SQLGenerationChain(model_name)

    async def search(
        self,
        query: str,
        chat_history: Optional[List[BaseMessage]] = None,
        limit: int = 1,
    ) -> Dict:
        """Search for products based on the query."""
        try:
            # Check cache first
            cache_key = f"search:{query}:{limit}"
            cached_result = await get_cache(cache_key)
            if cached_result:
                logger.info("Returning cached search results", query=query)
                return cached_result

            # Understand the query
            query_understanding = await self.query_understanding.run(
                query,
                chat_history,
            )

            # Generate SQL query
            sql_query = await self.sql_generation.run(
                query_understanding,
                limit,
            )

            # Extract parameters from query_understanding
            parameters = {
                "category_name": query_understanding.get("category", ""),
                "limit": limit
            }
            # Add features as parameters (feature1, feature2, ...)
            features = query_understanding.get("features", [])
            # The SQL may expect up to N features; let's support up to 8 for now
            for i in range(8):
                key = f"feature{i+1}"
                if i < len(features):
                    parameters[key] = f"%{features[i]}%"
                else:
                    parameters[key] = "%%"  # wildcard if not enough features

            # Execute SQL query
            async with get_db() as db:
                result = await db.execute(text(sql_query), parameters)
                products = result.fetchall()

            # Perform vector search with limit 1
            vector_results = await search_similar_products(
                query,
                n_results=1,
            )

            # Combine and rank results
            combined_results = self._combine_results(products, vector_results)

            # Cache the results
            await set_cache(cache_key, combined_results)

            return combined_results
        except Exception as e:
            logger.error("Error in search", error=str(e))
            raise

    def _combine_results(
        self,
        sql_results: List[Dict],
        vector_results: List[Dict],
    ) -> Dict:
        """Combine and rank results from SQL and vector search."""
        # Create a dictionary of products by ID
        products_by_id = {
            str(product["id"]): {
                "id": product["id"],
                "name": product["name"],
                "description": product["description"],
                "price": product["price"],
                "image_url": product["image_url"],
                "category_name": product["category_name"],
                "score": 1.0,  # Base score for SQL results
            }
            for product in sql_results
        }

        # Add vector search results
        for result in vector_results:
            product_id = result["id"]
            if product_id in products_by_id:
                # Increase score for products found in both searches
                products_by_id[product_id]["score"] += 1.0 - result["distance"]
            else:
                # Add new products from vector search
                products_by_id[product_id] = {
                    "id": product_id,
                    "name": result["metadata"].get("name", ""),
                    "description": result["metadata"].get("description", ""),
                    "price": result["metadata"].get("price", 0.0),
                    "image_url": result["metadata"].get("image_url", ""),
                    "category_name": result["metadata"].get("category_name", ""),
                    "score": 1.0 - result["distance"],
                }

        # Sort products by score and take only the top 1
        sorted_products = sorted(
            products_by_id.values(),
            key=lambda x: x["score"],
            reverse=True,
        )[:1]  # Take only the top 1 result

        return {
            "products": sorted_products,
            "total": len(sorted_products),
        } 