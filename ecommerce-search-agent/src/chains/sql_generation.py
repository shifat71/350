from typing import Dict, List, Optional
import json
import re

from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

from src.utils.logger import get_logger

logger = get_logger(__name__)

# System prompt for SQL generation
SQL_GENERATION_PROMPT = """You are a SQL expert. Your task is to generate a SQL query based on the query understanding results.

Database Schema:
- products (id, name, description, price, image_url, category_id)
- categories (id, name)

Rules:
1. Always use parameterized queries with :param_name syntax
2. Use ILIKE for case-insensitive text matching
3. Always include ORDER BY clause
4. Use proper table aliases (p for products, c for categories)
5. Always join with categories table using p.category_id = c.id
6. Use proper column names with case sensitivity:
   - p.category_id (not p.categoryId or p."categoryId")
   - p.image_url (not p.image)
   - All other column names are lowercase
7. Use LIMIT {limit} to return the top N results, where N is provided as a parameter.

Example:
Input: {{"category": "electronics", "features": ["wireless"], "price_range": {{"min": 100, "max": 500}}}}, Limit: 5
Output: SELECT p.id, p.name, p.description, p.price, p.image_url, c.name as category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE c.name ILIKE :category_name
AND p.description ILIKE :feature
AND p.price BETWEEN :min_price AND :max_price
ORDER BY p.price ASC
LIMIT 5;

Now generate a SQL query for:
{query_understanding}
Limit: {limit}

Remember to:
1. Use parameterized queries
2. Include proper JOINs
3. Add ORDER BY clause
4. Use proper column names with case sensitivity
5. Use LIMIT {limit} to return the top N results
6. Keep the query simple and efficient"""


class SQLGenerationChain:
    """Chain for generating SQL queries from query understanding results."""

    def __init__(self, model_name: str = "gpt-4-turbo-preview"):
        """Initialize the SQL generation chain."""
        self.model_name = model_name
        self.chain = self._create_chain()

    def _create_chain(self) -> LLMChain:
        """Create the chain with prompt and model."""
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", SQL_GENERATION_PROMPT),
                ("human", "{query_understanding}\nLimit: {limit}"),
            ]
        )
        llm = ChatOpenAI(model=self.model_name)
        return prompt | llm | StrOutputParser()

    async def run(
        self,
        query_understanding: Dict,
        limit: int = 1,
    ) -> str:
        """Run the SQL generation chain."""
        try:
            # Run the chain
            result = await self.chain.ainvoke({
                "query_understanding": json.dumps(query_understanding),
                "limit": limit
            })

            # Extract SQL query from the response
            if "```sql" in result:
                # Extract content between ```sql and ```
                sql_start = result.find("```sql") + 6
                sql_end = result.find("```", sql_start)
                if sql_end != -1:
                    result = result[sql_start:sql_end]
            else:
                # If no code block, try to find the first SELECT statement
                select_pos = result.upper().find("SELECT")
                if select_pos != -1:
                    result = result[select_pos:]

            result = result.strip()

            # Remove any trailing text after the final semicolon
            if ";" in result:
                result = result.split(";")[0] + ";"
            
            # Ensure the query has a LIMIT clause with the correct value
            if "LIMIT" in result.upper():
                # Replace any existing LIMIT with the correct value
                result = re.sub(r"LIMIT\s+\d+", f"LIMIT {limit}", result, flags=re.IGNORECASE)
            else:
                result = result.rstrip(";") + f" LIMIT {limit};"
            
            logger.info(
                "SQL generation completed",
                query_understanding=query_understanding,
                sql=result,
            )
            return result
        except Exception as e:
            logger.error("Error in SQL generation", error=str(e))
            raise

    def _validate_sql(self, sql: str) -> bool:
        """Validate the generated SQL query."""
        # Basic SQL injection prevention
        dangerous_keywords = [
            "DROP",
            "DELETE",
            "UPDATE",
            "INSERT",
            "ALTER",
            "TRUNCATE",
            "EXEC",
            "EXECUTE",
        ]
        
        sql_upper = sql.upper()
        return not any(keyword in sql_upper for keyword in dangerous_keywords) 