import os
from dotenv import load_dotenv
load_dotenv()
from typing import List, Optional, Dict, Any
from chromadb.api.models.Collection import Collection

import chromadb
from chromadb.config import Settings as ChromaSettings

from src.utils.logger import get_logger

logger = get_logger(__name__)

def get_required_env_var(name: str) -> str:
    """Get a required environment variable or raise an error."""
    value = os.environ.get(name)
    if not value:
        raise ValueError(f"Required environment variable {name} is not set")
    return value

# Initialize ChromaDB client with graceful failure handling
chroma_client = None
collection = None

try:
    chroma_client = chromadb.HttpClient(
        host=get_required_env_var("CHROMA_HOST"),
        port=int(get_required_env_var("CHROMA_PORT")),
        settings=ChromaSettings(
            anonymized_telemetry=False,
            allow_reset=True,
        ),
    )
    logger.info("ChromaDB client initialized successfully")
except Exception as e:
    logger.error("Failed to initialize ChromaDB client", error=str(e))
    logger.warning("ChromaDB functionality will be disabled")

# Create or get collection without embedding function (we'll handle embeddings manually)
if chroma_client:
    try:
        collection: Collection = chroma_client.get_or_create_collection(
            name="products",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB collection initialized successfully")
    except Exception as e:
        logger.error("Failed to create/get ChromaDB collection", error=str(e))
        collection = None

async def add_product_embedding(
    product_id: str,
    text: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Add a product embedding to ChromaDB."""
    if not collection:
        logger.warning("ChromaDB not available, skipping embedding addition")
        return
    
    if not product_id or not isinstance(product_id, str):
        raise ValueError("product_id must be a non-empty string")
    if not text or not isinstance(text, str):
        raise ValueError("text must be a non-empty string")
    if metadata is not None and not isinstance(metadata, dict):
        raise ValueError("metadata must be a dictionary or None")

    try:
        collection.add(
            ids=[product_id],
            documents=[text],
            metadatas=[metadata or {}],
        )
        logger.info("Product embedding added successfully", product_id=product_id)
    except Exception as e:
        logger.error("Error adding product embedding", error=str(e), product_id=product_id)
        # Don't raise, just log the error

async def search_similar_products(
    query: str,
    n_results: int = 1,
    where: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Search for similar products using vector similarity."""
    if not collection:
        logger.warning("ChromaDB not available, returning empty results")
        return []
    
    if not query or not isinstance(query, str):
        raise ValueError("query must be a non-empty string")
    if not isinstance(n_results, int) or n_results < 1:
        raise ValueError("n_results must be a positive integer")
    if where is not None and not isinstance(where, dict):
        raise ValueError("where must be a dictionary or None")

    try:
        # Generate embedding for the query using our embedding generator
        from src.embeddings.generator import generate_embedding
        query_embedding = await generate_embedding(query)
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
        )
        
        return [
            {
                "id": id_,
                "text": doc,
                "metadata": meta,
                "distance": dist,
            }
            for id_, doc, meta, dist in zip(
                results["ids"][0],
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            )
        ]
    except Exception as e:
        logger.error("Error searching similar products", error=str(e))
        return []

async def delete_product_embedding(product_id: str) -> None:
    """Delete a product embedding from ChromaDB."""
    if not collection:
        logger.warning("ChromaDB not available, skipping embedding deletion")
        return
    
    if not product_id or not isinstance(product_id, str):
        raise ValueError("product_id must be a non-empty string")

    try:
        collection.delete(ids=[product_id])
        logger.info("Product embedding deleted successfully", product_id=product_id)
    except Exception as e:
        logger.error("Error deleting product embedding", error=str(e), product_id=product_id)
        # Don't raise, just log the error 