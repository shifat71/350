from typing import Dict, List, Optional

from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI
import json
from src.utils.logger import get_logger

logger = get_logger(__name__)

# System prompt for query understanding
QUERY_UNDERSTANDING_PROMPT = """You are an expert e-commerce search query understanding system.
Your task is to analyze the user's query and extract key information that will help in finding relevant products.

For each query, you should identify:
1. Main product category or type
2. Key features or attributes
3. Price range (if mentioned)
4. Brand preferences (if any)
5. Any specific requirements or constraints

Format your response as a JSON object with the following structure:
{{
    "category": "string or null",
    "features": ["string"],
    "price_range": {{"min": float or null, "max": float or null}},
    "brands": ["string"],
    "constraints": ["string"]
}}

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
        llm = ChatOpenAI(model=self.model_name)
        return prompt | llm | StrOutputParser()

    async def run(
        self,
        query: str,
        chat_history: Optional[List[Dict]] = None,
    ) -> Dict:
        """Run the query understanding chain."""
        try:
            # Add chat history context if available
            if chat_history:
                context = "\n".join(
                    [f"Previous query: {msg['query']}" for msg in chat_history[-3:]]
                )
                query = f"Context from previous queries:\n{context}\n\nCurrent query: {query}"

            # Run the chain
            result = await self.chain.ainvoke({"query": query})
            
            # Parse the result
            try:
                structured_result = json.loads(result)
                logger.info(
                    "Query understanding completed",
                    query=query,
                    result=structured_result,
                )
                return structured_result
            except json.JSONDecodeError as e:
                logger.error(
                    "Error parsing query understanding result",
                    error=str(e),
                    result=result,
                )
                raise
        except Exception as e:
            logger.error("Error in query understanding", error=str(e))
            raise 