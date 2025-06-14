#!/usr/bin/env python3
"""
Test script to verify the search agent integration works.
"""

import asyncio
import sys
from pathlib import Path

# Add src to Python path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from dotenv import load_dotenv
from src.agents.search_agent import SearchAgent
from src.utils.logger import get_logger

# Load environment variables
load_dotenv()

logger = get_logger(__name__)

async def test_search_integration():
    """Test the search agent integration."""
    try:
        logger.info("Testing search agent integration...")
        
        # Initialize search agent
        search_agent = SearchAgent()
        
        # Test search query
        test_query = "wireless headphones"
        logger.info(f"Searching for: {test_query}")
        
        # Perform search
        results = await search_agent.search(test_query)
        
        logger.info(f"Search completed. Found {len(results)} results")
        
        # Display results
        for i, result in enumerate(results[:3], 1):  # Show first 3 results
            logger.info(f"Result {i}: ID={result.id}, Name={result.name}, Price=${result.price}")
        
        # Test if IDs are integers (this was the main issue)
        if results:
            first_result = results[0]
            logger.info(f"First result ID type: {type(first_result.id)}")
            logger.info(f"First result ID value: {first_result.id}")
            
            if isinstance(first_result.id, int):
                logger.info("✅ SUCCESS: Product IDs are integers (compatible with backend)")
            else:
                logger.error("❌ FAILURE: Product IDs are not integers")
        
        return results
        
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    asyncio.run(test_search_integration())
