import logging
from typing import List, Dict
import re

logger = logging.getLogger("duckduckgo_search")

# Try to import DDGS, fall back to HTML scraping if not available
try:
    from duckduckgo_search import DDGS
    HAS_DDGS = True
except ImportError:
    import requests
    from bs4 import BeautifulSoup
    HAS_DDGS = False

def clean_query(query: str) -> str:
    """Clean the search query by removing markdown and limiting length."""
    # Remove markdown formatting
    query = re.sub(r'\*\*(.*?)\*\*', r'\1', query)  # Remove bold
    query = re.sub(r'\*(.*?)\*', r'\1', query)      # Remove italic
    query = re.sub(r'`(.*?)`', r'\1', query)        # Remove code
    query = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', query)  # Remove links
    
    # Remove newlines and extra spaces
    query = ' '.join(query.split())
    
    # Limit query length to 200 characters
    if len(query) > 200:
        query = query[:197] + "..."
    
    return query

def duckduckgo_web_search(query: str, max_results: int = 5) -> List[Dict]:
    """
    Perform a web search using DuckDuckGo.
    
    Args:
        query: The search query
        max_results: Maximum number of results to return
        
    Returns:
        List of search results with title, href, and body
    """
    logger.info(f"Performing DuckDuckGo web search for query: {query}")
    results = []
    
    # Clean the query
    clean_q = clean_query(query)
    logger.info(f"Cleaned query: {clean_q}")
    
    # Try DDGS first if available
    if HAS_DDGS:
        try:
            with DDGS() as ddgs:
                for r in ddgs.text(clean_q, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "href": r.get("href", ""),
                        "body": r.get("body", ""),
                    })
            if results:
                logger.info(f"DuckDuckGo search returned {len(results)} results using DDGS")
                return results
        except Exception as e:
            logger.error(f"Error using DDGS: {str(e)}")
    
    # Fall back to HTML scraping
    try:
        # Use the HTML search interface
        url = f"https://html.duckduckgo.com/html/?q={clean_q}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, "html.parser")
        for result in soup.select(".result")[:max_results]:
            title_elem = result.select_one(".result__title")
            snippet_elem = result.select_one(".result__snippet")
            link_elem = result.select_one(".result__url")
            
            if title_elem and link_elem:
                results.append({
                    "title": title_elem.get_text(strip=True),
                    "href": link_elem.get_text(strip=True),
                    "body": snippet_elem.get_text(strip=True) if snippet_elem else "",
                })
    except Exception as e:
        logger.error(f"Error scraping DuckDuckGo: {str(e)}")
        # Return empty results instead of failing
        return []
    
    logger.info(f"DuckDuckGo search returned {len(results)} results using HTML scraping")
    return results 