from typing import Dict, List, Optional, Any, TypedDict
from pydantic import BaseModel, Field, validator
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI
import json
from src.utils.logger import get_logger

logger = get_logger(__name__)

class PriceRange(BaseModel):
    """Price range model for query understanding."""
    min: Optional[float] = Field(None, ge=0)
    max: Optional[float] = Field(None, ge=0)

    @validator('max')
    def validate_max_price(cls, v: Optional[float], values: Dict[str, Any]) -> Optional[float]:
        """Validate that max price is greater than min price if both are set."""
        if v is not None and values.get('min') is not None and v < values['min']:
            raise ValueError("max price must be greater than min price")
        return v

class QueryUnderstandingResult(BaseModel):
    """Structured result of query understanding."""
    category: Optional[str] = Field(None, max_length=100)
    features: List[str] = Field(default_factory=list)
    price_range: Optional[PriceRange] = None
    brands: List[str] = Field(default_factory=list, max_items=5)
    constraints: List[str] = Field(default_factory=list, max_items=5)

    @validator('features')
    def validate_features(cls, v: List[str]) -> List[str]:
        """Validate and limit features to top 10 items."""
        if len(v) > 10:
            logger.warning(f"Features list too long ({len(v)} items), truncating to 10 most important")
            return v[:10]  # Take first 10 features
        return v

    @validator('brands')
    def validate_brands(cls, v: List[str]) -> List[str]:
        """Validate and limit brands to 5 items."""
        if len(v) > 5:
            logger.warning(f"Brands list too long ({len(v)} items), truncating to 5")
            return v[:5]
        return v

    @validator('constraints')
    def validate_constraints(cls, v: List[str]) -> List[str]:
        """Validate and limit constraints to 5 items."""
        if len(v) > 5:
            logger.warning(f"Constraints list too long ({len(v)} items), truncating to 5")
            return v[:5]
        return v

# System prompt for query understanding
QUERY_UNDERSTANDING_PROMPT = """You are an expert e-commerce search query understanding system.
Your task is to analyze the user's query and extract key information that will help in finding relevant products.

For each query, you should identify:
1. Main product category or type
2. Key features or attributes (MAXIMUM 10 most important ones)
3. Price range (if mentioned)
4. Brand preferences (if any, MAXIMUM 5)
5. Any specific requirements or constraints (MAXIMUM 5)

Format your response as a JSON object with the following structure:
{{
    "category": "string or null",
    "features": ["string"],
    "price_range": {{"min": float or null, "max": float or null}},
    "brands": ["string"],
    "constraints": ["string"]
}}

Rules:
- Keep category names concise and specific
- Extract only the TOP 10 most relevant features that would help in product search
- Price ranges should be in the same currency (default: USD)
- Only include brands if explicitly mentioned (max 5)
- Constraints should be specific requirements that limit the search (max 5)
- Focus on the most important and distinctive features

Example:
Input: "I'm looking for a wireless gaming mouse under $50 with RGB lighting"
Output:
{{
    "category": "gaming mouse",
    "features": ["wireless", "RGB lighting"],
    "price_range": {{"min": null, "max": 50.0}},
    "brands": [],
    "constraints": []
}}

Input: {query}
Output:"""

class QueryUnderstandingChain:
    """Chain for understanding and structuring user queries."""

    def __init__(self, model_name: str = "gpt-4-turbo-preview"):
        """Initialize the query understanding chain."""
        self.model_name = model_name
        self.chain = self._create_chain()

    def _create_chain(self) -> LLMChain:
        """Create the chain with prompt and model."""
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", QUERY_UNDERSTANDING_PROMPT),
                ("human", "{query}"),
            ]
        )
        llm = ChatOpenAI(
            model=self.model_name,
            temperature=0.1,  # Lower temperature for more consistent results
            max_tokens=500,   # Limit response size
        )
        return prompt | llm | StrOutputParser()

    async def run(
        self,
        query: str,
        chat_history: Optional[List[Dict[str, Any]]] = None,
    ) -> QueryUnderstandingResult:
        """
        Run the query understanding chain.
        
        Args:
            query: The user's search query
            chat_history: Optional list of previous queries for context
            
        Returns:
            QueryUnderstandingResult containing structured query information
            
        Raises:
            ValueError: If the query is invalid or empty
            json.JSONDecodeError: If the LLM response cannot be parsed
            Exception: For other errors during processing
        """
        if not query or not isinstance(query, str):
            raise ValueError("query must be a non-empty string")
        
        try:
            # Add chat history context if available
            if chat_history:
                context = "\n".join(
                    [f"Previous query: {msg['query']}" for msg in chat_history[-3:]]
                )
                query = f"Context from previous queries:\n{context}\n\nCurrent query: {query}"

            # Run the chain
            result = await self.chain.ainvoke({"query": query})
            
            # Parse and validate the result
            try:
                raw_result = json.loads(result)
                structured_result = QueryUnderstandingResult(**raw_result)
                
                logger.info(
                    "Query understanding completed",
                    query=query,
                    result=structured_result.dict(),
                )
                return structured_result
            except json.JSONDecodeError as e:
                logger.error(
                    "Error parsing query understanding result",
                    error=str(e),
                    result=result,
                )
                raise
            except ValueError as e:
                logger.error(
                    "Error validating query understanding result",
                    error=str(e),
                    result=raw_result,
                )
                raise
        except Exception as e:
            logger.error("Error in query understanding", error=str(e))
            raise 