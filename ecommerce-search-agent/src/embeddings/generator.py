import os
from dotenv import load_dotenv
load_dotenv()
from typing import List
import openai
from src.utils.logger import get_logger

logger = get_logger(__name__)

async def generate_embedding(text: str, model: str = "text-embedding-ada-002") -> List[float]:
    """Generate an embedding for the given text using OpenAI API."""
    try:
        response = await openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"]).embeddings.create(
            input=text,
            model=model,
        )
        embedding = response.data[0].embedding
        logger.info("Generated embedding", length=len(embedding))
        return embedding
    except Exception as e:
        logger.error("Error generating embedding", error=str(e))
        raise 