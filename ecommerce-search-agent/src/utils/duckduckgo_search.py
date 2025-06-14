import logging
from typing import List, Dict

try:
    from duckduckgo_search import DDGS
    _HAS_DDGS = True
except ImportError:
    import requests
    from bs4 import BeautifulSoup
    _HAS_DDGS = False

logger = logging.getLogger("duckduckgo_search")


def duckduckgo_web_search(query: str, max_results: int = 5) -> List[Dict]:
    logger.info(f"Performing DuckDuckGo web search for query: {query}")
    results = []
    if _HAS_DDGS:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title"),
                    "href": r.get("href"),
                    "body": r.get("body"),
                })
    else:
        # Fallback: scrape DuckDuckGo HTML (less reliable, for demo only)
        url = f"https://html.duckduckgo.com/html/?q={query}"
        resp = requests.get(url)
        soup = BeautifulSoup(resp.text, "html.parser")
        for a in soup.select("a.result__a")[:max_results]:
            results.append({
                "title": a.text,
                "href": a["href"],
                "body": "",
            })
    logger.info(f"DuckDuckGo search returned {len(results)} results")
    return results 