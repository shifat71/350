from fastapi import APIRouter, BackgroundTasks
from src.api.models import AdminRebuildResponse
from src.utils.logger import get_logger
import asyncio
from scripts.rebuild_embeddings import main as rebuild_embeddings_main

router = APIRouter()
logger = get_logger(__name__)

async def run_rebuild_embeddings():
    await rebuild_embeddings_main()

@router.post("/rebuild-embeddings", response_model=AdminRebuildResponse)
async def rebuild_embeddings_endpoint(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_rebuild_embeddings)
    logger.info("Triggered background task to rebuild embeddings")
    return AdminRebuildResponse(status="ok", message="Embedding rebuild started in background.") 