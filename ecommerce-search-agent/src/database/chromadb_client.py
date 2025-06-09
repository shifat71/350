import os
from dotenv import load_dotenv
load_dotenv()
from typing import List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions

from src.utils.logger import get_logger

logger = get_logger(__name__)

# Initialize ChromaDB client
chroma_client = chromadb.HttpClient(
    host=os.environ.get("CHROMA_HOST", "localhost"),
    port=os.environ.get("CHROMA_PORT"),
    settings=ChromaSettings(
        anonymized_telemetry=False,
        allow_reset=True,
    ),
)

# Initialize OpenAI embedding function
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key=os.environ.get("OPENAI_API_KEY"),
    model_name="text-embedding-ada-002",
)

# Create or get collection
collection = chroma_client.get_or_create_collection(
    name="products",
    embedding_function=openai_ef,
    metadata={"hnsw:space": "cosine"},
)


async def add_product_embedding(
    product_id: str,
    text: str,
    metadata: Optional[dict] = None,
) -> None:
    """Add a product embedding to ChromaDB."""
    try:
        collection.add(
            ids=[product_id],
            documents=[text],
            metadatas=[metadata or {}],
        )
        logger.info("Product embedding added successfully", product_id=product_id)
    except Exception as e:
        logger.error("Error adding product embedding", error=str(e), product_id=product_id)
        raise


async def search_similar_products(
    query: str,
    n_results: int = 1,
    where: Optional[dict] = None,
) -> List[dict]:
    """Search for similar products using vector similarity."""
    try:
        results = collection.query(
            query_texts=[query],
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
        raise


async def delete_product_embedding(product_id: str) -> None:
    """Delete a product embedding from ChromaDB."""
    try:
        collection.delete(ids=[product_id])
        logger.info("Product embedding deleted successfully", product_id=product_id)
    except Exception as e:
        logger.error("Error deleting product embedding", error=str(e), product_id=product_id)
        raise 