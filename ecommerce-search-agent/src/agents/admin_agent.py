from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime, timedelta
import os
import asyncio
from src.utils.logger import get_logger
from scripts.rebuild_embeddings import main as rebuild_embeddings_main

logger = get_logger(__name__)

class AdminConfig(BaseModel):
    """Configuration for admin operations."""
    min_rebuild_interval: int = Field(default=3600, ge=300, le=86400)  # 1 hour default
    max_concurrent_tasks: int = Field(default=1, ge=1, le=5)
    task_timeout: int = Field(default=3600, ge=60, le=7200)  # 1 hour default

    @validator('min_rebuild_interval')
    def validate_rebuild_interval(cls, v: int) -> int:
        """Validate rebuild interval."""
        if v < 300 or v > 86400:
            raise ValueError("min_rebuild_interval must be between 300 and 86400 seconds")
        return v

class AdminTask(BaseModel):
    """Model for admin task status."""
    task_id: str
    task_type: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    error: Optional[str] = None

    @validator('status')
    def validate_status(cls, v: str) -> str:
        """Validate task status."""
        valid_statuses = {'pending', 'running', 'completed', 'failed'}
        if v not in valid_statuses:
            raise ValueError(f"status must be one of {valid_statuses}")
        return v

class AdminAgent:
    """Agent for handling admin tasks."""

    def __init__(
        self,
        config: Optional[AdminConfig] = None,
    ):
        """
        Initialize the admin agent.
        
        Args:
            config: Optional configuration for admin operations
        """
        self.config = config or AdminConfig()
        self.tasks: Dict[str, AdminTask] = {}
        self.last_rebuild_time: Optional[datetime] = None

    async def verify_admin_token(self, token: str) -> bool:
        """
        Verify the admin token.
        
        Args:
            token: The admin token to verify
            
        Returns:
            bool: True if token is valid
            
        Raises:
            ValueError: If token verification fails
        """
        expected_token = os.environ.get("ADMIN_TOKEN")
        if not expected_token:
            logger.error("ADMIN_TOKEN environment variable not set")
            raise ValueError("Admin authentication not configured")
        
        if token != expected_token:
            logger.warning("Invalid admin token provided")
            raise ValueError("Invalid admin token")
        
        return True

    async def rebuild_embeddings(
        self,
        task_id: str,
    ) -> AdminTask:
        """
        Rebuild product embeddings.
        
        Args:
            task_id: Unique identifier for the task
            
        Returns:
            AdminTask containing task status
            
        Raises:
            ValueError: If rebuild cannot be started
        """
        # Check if enough time has passed since last rebuild
        if self.last_rebuild_time and datetime.now() - self.last_rebuild_time < timedelta(seconds=self.config.min_rebuild_interval):
            raise ValueError(
                f"Please wait at least {self.config.min_rebuild_interval / 3600} hours between rebuild requests"
            )
        
        # Create task
        task = AdminTask(
            task_id=task_id,
            task_type="rebuild_embeddings",
            status="running",
            start_time=datetime.now(),
        )
        self.tasks[task_id] = task
        
        try:
            # Update last rebuild time
            self.last_rebuild_time = datetime.now()
            
            # Run rebuild in background
            asyncio.create_task(self._run_rebuild_task(task))
            
            logger.info(
                "Started embedding rebuild task",
                task_id=task_id,
            )
            return task
        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            task.end_time = datetime.now()
            logger.error(
                "Failed to start rebuild task",
                task_id=task_id,
                error=str(e),
            )
            raise

    async def _run_rebuild_task(self, task: AdminTask) -> None:
        """
        Run the rebuild task in the background.
        
        Args:
            task: The task to run
        """
        try:
            # Run rebuild with timeout
            await asyncio.wait_for(
                rebuild_embeddings_main(),
                timeout=self.config.task_timeout,
            )
            
            # Update task status
            task.status = "completed"
            task.end_time = datetime.now()
            
            logger.info(
                "Completed embedding rebuild task",
                task_id=task.task_id,
            )
        except asyncio.TimeoutError:
            task.status = "failed"
            task.error = "Task timed out"
            task.end_time = datetime.now()
            logger.error(
                "Rebuild task timed out",
                task_id=task.task_id,
            )
        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            task.end_time = datetime.now()
            logger.error(
                "Rebuild task failed",
                task_id=task.task_id,
                error=str(e),
            )

    async def get_task_status(self, task_id: str) -> Optional[AdminTask]:
        """
        Get the status of a task.
        
        Args:
            task_id: ID of the task to check
            
        Returns:
            Optional[AdminTask]: Task status if found
        """
        return self.tasks.get(task_id)

    async def list_tasks(
        self,
        task_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[AdminTask]:
        """
        List admin tasks with optional filtering.
        
        Args:
            task_type: Optional filter by task type
            status: Optional filter by task status
            
        Returns:
            List of matching tasks
        """
        tasks = list(self.tasks.values())
        
        if task_type:
            tasks = [t for t in tasks if t.task_type == task_type]
        
        if status:
            tasks = [t for t in tasks if t.status == status]
        
        return tasks 