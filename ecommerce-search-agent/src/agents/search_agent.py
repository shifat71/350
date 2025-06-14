from typing import Dict, List, Optional, Any
from sqlalchemy import select, and_, or_, func

from langchain.tools import BaseTool, Tool
from langchain_core.messages import BaseMessage

from src.agents.base_agent import BaseAgent
from src.chains.query_understanding import QueryUnderstandingChain, QueryUnderstandingResult
from src.chains.sql_generation import SQLGenerationChain, SQLGenerationConfig
from src.database.chromadb_client import search_similar_products
from src.database.postgres import get_db
from src.database.redis_client import get_cache, set_cache
from src.utils.logger import get_logger
from sqlalchemy import text
from src.utils.duckduckgo_search import duckduckgo_web_search
from src.database.models import Product, Category

logger = get_logger(__name__)

# System prompt for the search agent
SEARCH_AGENT_PROMPT = """You are an expert e-commerce search agent that helps users find products.
Your task is to understand user queries, search for relevant products, and provide helpful responses.

You have access to the following tools:
1. Query Understanding: Analyzes the user's query to extract key information
2. SQL Generation: Converts structured query understanding into SQL queries
3. Vector Search: Finds similar products using semantic search
4. Database Search: Executes SQL queries to find products
5. Web Search: Use DuckDuckGo to search the web for additional context or information about the query

Follow these steps for each query:
1. Use Query Understanding to analyze the query (optionally use Web Search for more context)
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

# Add the DuckDuckGo web search tool to the default tools
web_search_tool = Tool(
    name="web_search",
    description="Search the web using DuckDuckGo to get additional context or information about the user's query.",
    func=lambda query: duckduckgo_web_search(query, max_results=5),
)

class SearchAgent(BaseAgent):
    """Search agent for finding products based on user queries."""

    def __init__(
        self,
        tools: List[BaseTool] = None,
        model_name: str = "gpt-4-turbo-preview",
    ):
        """Initialize the search agent."""
        # Add web_search_tool to the tools list if not present
        if tools is None:
            tools = [web_search_tool]
        else:
            tools = tools + [web_search_tool]
        super().__init__(tools, SEARCH_AGENT_PROMPT, model_name)
        self.query_understanding = QueryUnderstandingChain(model_name)
        self.sql_generation = SQLGenerationChain(model_name)

    async def search(
        self,
        query: str,
        chat_history: Optional[List[BaseMessage]] = None,
        limit: int = 5,
    ) -> Dict:
        """
        Search for products based on the query.
        
        Args:
            query: The user's search query
            chat_history: Optional list of previous messages for context
            limit: Maximum number of results to return
            
        Returns:
            Dict containing search results and metadata
            
        Raises:
            ValueError: If the query is invalid
            Exception: For other errors during processing
        """
        if not query or not isinstance(query, str):
            raise ValueError("query must be a non-empty string")
        
        try:
            logger.info(f"Starting search for query: {query}")
            # Check cache first
            cache_key = f"search:{query}:{limit}"
            cached_result = await get_cache(cache_key)
            if cached_result:
                logger.info("Returning cached search results", query=query)
                return cached_result

            # Optionally use web search for more context
            logger.info(f"Performing web search for query understanding: {query}")
            web_results = duckduckgo_web_search(query, max_results=3)
            logger.info(f"Web search results: {web_results}")

            # Understand the query (pass web results as context)
            query_context = query + "\nWeb context:\n" + "\n".join([r["title"] + ": " + (r["body"] or "") for r in web_results])
            logger.info(f"Running query understanding with context: {query_context}")
            query_understanding = await self.query_understanding.run(
                query_context,
                chat_history,
            )
            logger.info(f"Query understanding result: {query_understanding}")

            # Generate SQL query
            sql_config = SQLGenerationConfig(limit=limit)
            sql_query = await self.sql_generation.run(query_understanding, sql_config)
            logger.info(f"Generated SQL query: {sql_query}")

            # Execute SQL query
            logger.info("Executing SQL query")
            async with get_db() as db:
                # Extract parameters from query understanding
                params = {
                    "category_name": f"%{query_understanding.category}%" if query_understanding.category else None,
                    "min_price": query_understanding.price_range.min if query_understanding.price_range else None,
                    "max_price": query_understanding.price_range.max if query_understanding.price_range else None,
                    "limit": limit
                }
                # Add feature parameters (ensure slots for all features used in the SQL)
                max_features = max(7, len(query_understanding.features))  # Support up to 7 features
                for i in range(max_features):
                    if i < len(query_understanding.features):
                        params[f"feature_{i}"] = f"%{query_understanding.features[i]}%"
                    else:
                        params[f"feature_{i}"] = None
                        
                # Add brand parameters (ensure slots for all brands used in the SQL)
                max_brands = max(3, len(query_understanding.brands))  # Support up to 3 brands
                for i in range(max_brands):
                    if i < len(query_understanding.brands):
                        params[f"brand_{i}"] = f"%{query_understanding.brands[i]}%"
                    else:
                        params[f"brand_{i}"] = None
                        
                # Add constraint parameters
                max_constraints = max(1, len(query_understanding.constraints))
                for i in range(max_constraints):
                    if i < len(query_understanding.constraints):
                        params[f"constraint_{i}"] = f"%{query_understanding.constraints[i]}%"
                    else:
                        params[f"constraint_{i}"] = None
                # Prepare parameters for SQL execution
                string_keys = set()
                # Identify string/text parameters
                for k in params:
                    if k.startswith("feature_") or k.startswith("brand_") or k.startswith("constraint_") or k == "category_name":
                        string_keys.add(k)
                # Cast only string/text parameters to strings
                for k in string_keys:
                    if params[k] is not None:
                        params[k] = str(params[k])
                # min_price, max_price, and limit remain as numbers or None
                result = await db.execute(text(sql_query), params)
                products = result.mappings().all()
            logger.info(f"SQL query returned {len(products)} products")

            # Perform vector search with limit
            logger.info(f"Performing vector search for: {query}")
            vector_results = await search_similar_products(
                query,
                n_results=limit,
            )
            logger.info(f"Vector search returned {len(vector_results)} results")

            # Combine and rank results
            combined_results = self._combine_results(products, vector_results, limit)
            logger.info(f"Combined results: {combined_results}")

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
        limit: int,
    ) -> Dict:
        """
        Combine and rank results from SQL and vector search.
        
        Args:
            sql_results: List of products from SQL search
            vector_results: List of products from vector search
            limit: Maximum number of results to return
            
        Returns:
            Dict containing combined and ranked results
        """
        # Create a dictionary of products by ID
        products_by_id = {}
        for product in sql_results:
            # Convert features and specifications properly for SQL results
            features = product.get("features", [])
            if isinstance(features, str):
                try:
                    import json
                    features = json.loads(features) if features else []
                except:
                    features = []
            
            specifications = product.get("specifications")
            if isinstance(specifications, str):
                try:
                    import json
                    specifications = json.loads(specifications) if specifications else {}
                except:
                    specifications = {}
            
            products_by_id[str(product["id"])] = {
                "id": int(product["id"]),  # Ensure ID is integer
                "name": product["name"],
                "description": product.get("description"),
                "price": float(product["price"]),
                "originalPrice": product.get("originalPrice"),
                "image": product["image"],
                "images": product.get("images", []),
                "rating": float(product.get("rating", 0)),
                "reviews": int(product.get("reviews", 0)),
                "inStock": product.get("inStock", True),
                "stock": int(product.get("stock", 0)),
                "features": features,
                "specifications": specifications,
                "category_name": product["category_name"],
                "score": float(product.get("score", 1.0)),  # Use SQL score if available
            }

        # Add vector search results
        for result in vector_results:
            product_id = str(result["id"])  # ChromaDB stores as string
            if product_id in products_by_id:
                # Increase score for products found in both searches
                products_by_id[product_id]["score"] += 1.0 - result["distance"]
            else:
                # Add new products from vector search with metadata
                metadata = result.get("metadata", {})
                # Try to get the backend ID from metadata, otherwise use the ChromaDB ID
                backend_id = metadata.get("backend_id", result["id"])
                try:
                    backend_id = int(backend_id)
                except (ValueError, TypeError):
                    logger.warning(f"Could not convert backend_id to integer: {backend_id}")
                    continue  # Skip this result if we can't get a valid backend ID
                    
                # Convert features and specifications from string metadata
                features = metadata.get("features", "[]")
                if isinstance(features, str):
                    try:
                        import json
                        features = json.loads(features) if features else []
                    except:
                        features = []
                
                specifications = metadata.get("specifications", "{}")
                if isinstance(specifications, str):
                    try:
                        import json
                        specifications = json.loads(specifications) if specifications else {}
                    except:
                        specifications = {}
                
                products_by_id[product_id] = {
                    "id": backend_id,
                    "name": metadata.get("name", ""),
                    "description": metadata.get("description", ""),
                    "price": float(metadata.get("price", 0.0)),
                    "originalPrice": None,
                    "image": metadata.get("image", ""),
                    "images": [],
                    "rating": float(metadata.get("rating", 0)),
                    "reviews": int(metadata.get("reviews", 0)),
                    "inStock": metadata.get("in_stock", True),
                    "stock": int(metadata.get("stock", 0)),
                    "features": features,
                    "specifications": specifications,
                    "category_name": metadata.get("category", ""),
                    "score": 1.0 - result["distance"],
                }

        # Sort products by score and take only the top n (limit)
        sorted_products = sorted(
            products_by_id.values(),
            key=lambda x: x["score"],
            reverse=True,
        )[:limit]  # Take only the top n results

        # Ensure IDs are integers and scores are clamped
        for product in sorted_products:
            if not isinstance(product["id"], int):
                try:
                    product["id"] = int(product["id"])
                except (ValueError, TypeError):
                    logger.warning(f"Could not convert product ID to integer: {product['id']}")
            # Clamp score to a maximum of 2.0 (1.0 from SQL + 1.0 from vector)
            if "score" in product:
                product["score"] = min(product["score"], 2.0)

        return {
            "products": sorted_products,
            "total": len(sorted_products),
        } 