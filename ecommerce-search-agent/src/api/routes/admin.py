from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header
from src.agents.admin_agent import AdminAgent
from src.api.models import AdminRebuildResponse, AdminTaskResponse, AdminTaskListResponse
import logging
import uuid

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)

# Initialize admin agent
admin_agent = AdminAgent()

async def verify_admin_token(x_admin_token: str = Header(...)) -> None:
    """Verify admin token."""
    if not await admin_agent.verify_admin_token(x_admin_token):
        raise HTTPException(
            status_code=401,
            detail="Invalid admin token"
        )

@router.post("/rebuild-embeddings", response_model=AdminRebuildResponse)
async def rebuild_embeddings(
    _: None = Depends(verify_admin_token)
) -> AdminRebuildResponse:
    """Trigger a background task to rebuild product embeddings."""
    try:
        task_id = str(uuid.uuid4())
        await admin_agent.rebuild_embeddings(task_id)
        return AdminRebuildResponse(
            status="success",
            message="Embedding rebuild task started",
            task_id=task_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=429,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error starting rebuild task: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to start rebuild task"
        )

@router.get("/tasks/{task_id}", response_model=AdminTaskResponse)
async def get_task_status(
    task_id: str,
    _: None = Depends(verify_admin_token)
) -> AdminTaskResponse:
    """Get the status of a specific admin task."""
    try:
        task = await admin_agent.get_task_status(task_id)
        if not task:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )
        return AdminTaskResponse(**task.dict())
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get task status"
        )

@router.get("/tasks", response_model=AdminTaskListResponse)
async def list_tasks(
    task_type: Optional[str] = None,
    status: Optional[str] = None,
    _: None = Depends(verify_admin_token)
) -> AdminTaskListResponse:
    """List admin tasks with optional filtering."""
    try:
        tasks = await admin_agent.list_tasks(task_type, status)
        return AdminTaskListResponse(
            tasks=[AdminTaskResponse(**task.dict()) for task in tasks],
            total=len(tasks)
        )
    except Exception as e:
        logger.error(f"Error listing tasks: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to list tasks"
        ) 