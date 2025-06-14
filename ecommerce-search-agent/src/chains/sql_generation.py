from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator
import json
import re
from enum import Enum

from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

from src.utils.logger import get_logger
from src.chains.query_understanding import QueryUnderstandingResult

logger = get_logger(__name__)

class SortOrder(str, Enum):
    """Enum for SQL sort orders."""
    ASC = "ASC"
    DESC = "DESC"

class SQLGenerationConfig(BaseModel):
    """Configuration for SQL generation."""
    limit: int = Field(default=10, ge=1, le=100)
    sort_by: str = Field(default="price")
    sort_order: SortOrder = Field(default=SortOrder.ASC)
    min_score: float = Field(default=0.0, ge=0.0, le=1.0)

    @validator('sort_by')
    def validate_sort_by(cls, v: str) -> str:
        """Validate sort_by field."""
        valid_fields = {'price', 'name', 'id', 'category_name'}
        if v not in valid_fields:
            raise ValueError(f"sort_by must be one of {valid_fields}")
        return v

# System prompt for SQL generation
SQL_GENERATION_PROMPT = """You are an expert SQL query generator for an e-commerce product search system.
Your task is to generate SQL queries based on structured query understanding results.

Rules for SQL generation:
1. Always use parameterized queries with :param_name syntax
2. Use ILIKE for case-insensitive text matching
3. Use proper JOINs between products and categories tables
4. Include a score column for ranking results
5. Handle NULL parameters correctly
6. Use constraints as optional search terms in the WHERE clause
7. Cast numeric parameters to the correct type

Example input:
{{
    "category": "electronics",
    "features": ["wireless", "bluetooth"],
    "price_range": {{"min": 100, "max": 500}},
    "brands": ["sony", "samsung"],
    "constraints": ["portable", "waterproof"]
}}

Example output:
SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    c.name as category_name,
    CASE 
        WHEN c.name ILIKE :category_name THEN 1.0
        WHEN p.description ILIKE :feature_0 THEN 0.8
        WHEN p.name ILIKE :brand_0 THEN 0.6
        WHEN p.name ILIKE :brand_1 THEN 0.6
        WHEN p.name ILIKE :brand_2 THEN 0.6
        ELSE 0.5
    END as score
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE (c.name ILIKE :category_name OR :category_name IS NULL)
AND (
    p.description ILIKE :feature_0 OR 
    :feature_0 IS NULL
)
AND (
    p.name ILIKE :brand_0 OR 
    p.name ILIKE :brand_1 OR 
    p.name ILIKE :brand_2 OR 
    :brand_0 IS NULL
)
AND (CAST(p.price AS numeric) <= CAST(:max_price AS numeric) OR :max_price IS NULL)
ORDER BY score DESC, p.price ASC
LIMIT CAST(:limit AS integer);

Remember to:
1. Handle NULL parameters correctly
2. Include a score column for ranking
3. Use parameterized queries
4. Add proper JOINs
5. Include ORDER BY clause
6. Add LIMIT clause
7. Use constraints as optional search terms
8. Cast numeric parameters to the correct type"""

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
        llm = ChatOpenAI(
            model=self.model_name,
            temperature=0.1,  # Lower temperature for more consistent results
            max_tokens=1000,  # Allow for longer queries
        )
        return prompt | llm | StrOutputParser()

    async def run(
        self,
        query_understanding: QueryUnderstandingResult,
        config: Optional[SQLGenerationConfig] = None,
    ) -> str:
        """
        Run the SQL generation chain.
        
        Args:
            query_understanding: The structured query understanding result
            config: Optional configuration for SQL generation
            
        Returns:
            Generated SQL query string
            
        Raises:
            ValueError: If the query understanding is invalid
            Exception: For other errors during processing
        """
        if not isinstance(query_understanding, QueryUnderstandingResult):
            raise ValueError("query_understanding must be a QueryUnderstandingResult instance")
        
        config = config or SQLGenerationConfig()
        
        try:
            # Run the chain
            result = await self.chain.ainvoke({
                "query_understanding": query_understanding.json(),
                "limit": config.limit
            })

            # Extract SQL query from the response
            sql_query = self._extract_sql_query(result)
            
            # Validate and clean the query
            sql_query = self._clean_sql_query(sql_query, config)
            
            if not self._validate_sql(sql_query):
                raise ValueError("Generated SQL query contains dangerous operations")
            
            logger.info(
                "SQL generation completed",
                query_understanding=query_understanding.dict(),
                config=config.dict(),
                sql=sql_query,
            )
            return sql_query
        except Exception as e:
            logger.error("Error in SQL generation", error=str(e))
            raise

    def _extract_sql_query(self, result: str) -> str:
        """Extract SQL query from the LLM response."""
        if "```sql" in result:
            # Extract content between ```sql and ```
            sql_start = result.find("```sql") + 6
            sql_end = result.find("```", sql_start)
            if sql_end != -1:
                return result[sql_start:sql_end].strip()
        
        # If no code block, try to find the first SELECT statement
        select_pos = result.upper().find("SELECT")
        if select_pos != -1:
            return result[select_pos:].strip()
        
        raise ValueError("Could not extract SQL query from response")

    def _clean_sql_query(self, sql: str, config: SQLGenerationConfig) -> str:
        """Clean and format the SQL query."""
        # Remove any trailing text after the final semicolon
        if ";" in sql:
            sql = sql.split(";")[0] + ";"
        
        # Ensure the query has a LIMIT clause with the correct value
        if "LIMIT" in sql.upper():
            sql = re.sub(r"LIMIT\s+\d+", f"LIMIT {config.limit}", sql, flags=re.IGNORECASE)
        else:
            sql = sql.rstrip(";") + f" LIMIT {config.limit};"
        
        # Ensure proper ORDER BY clause
        if "ORDER BY" not in sql.upper():
            sql = sql.rstrip(";") + f" ORDER BY {config.sort_by} {config.sort_order.value};"
        
        return sql.strip()

    def _validate_sql(self, sql: str) -> bool:
        """
        Validate the generated SQL query.
        
        Args:
            sql: The SQL query to validate
            
        Returns:
            bool: True if the query is valid, False otherwise
        """
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
            "UNION",
            "INTO",
            "OUTFILE",
            "DUMPFILE",
        ]
        
        # Check for dangerous keywords
        sql_upper = sql.upper()
        if any(keyword in sql_upper for keyword in dangerous_keywords):
            return False
        
        # Validate basic SQL structure
        if not sql_upper.startswith("SELECT"):
            return False
        
        # Check for required clauses
        required_clauses = ["FROM", "ORDER BY", "LIMIT"]
        if not all(clause in sql_upper for clause in required_clauses):
            return False
        
        return True 