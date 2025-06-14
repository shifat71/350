from typing import List, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field, validator, HttpUrl
from decimal import Decimal
from datetime import datetime

class TextSearchRequest(BaseModel):
    """Request model for text-based product search."""
    query: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="User's search query"
    )
    limit: int = Field(
        default=5,
        ge=1,
        le=100,
        description="Number of top products to return"
    )

    @validator('query')
    def validate_query(cls, v: str) -> str:
        """Validate and clean the search query."""
        return v.strip()

class ImageSearchRequest(BaseModel):
    """Request model for image-based product search."""
    image_base64: str = Field(
        ...,
        min_length=100,  # Minimum length for a valid base64 image
        description="Base64-encoded image data (with or without data URL prefix)"
    )
    query: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=500,
        description="Optional text to accompany the image"
    )
    limit: int = Field(
        default=5,
        ge=1,
        le=100,
        description="Number of top products to return"
    )

    @validator('image_base64')
    def validate_base64(cls, v: str) -> str:
        """Validate and normalize base64 image data."""
        # Remove any whitespace
        v = v.strip()
        
        # Add data URL prefix if missing
        if not v.startswith('data:image/'):
            # Try to detect image type from first few bytes
            try:
                import base64
                decoded = base64.b64decode(v[:100])  # Decode just enough to detect type
                if decoded.startswith(b'\xff\xd8'):
                    v = f"data:image/jpeg;base64,{v}"
                elif decoded.startswith(b'\x89PNG'):
                    v = f"data:image/png;base64,{v}"
                else:
                    v = f"data:image/png;base64,{v}"  # Default to PNG
            except:
                v = f"data:image/png;base64,{v}"  # Default to PNG on error
                
        return v

class Product(BaseModel):
    """Product model for API responses."""
    id: UUID
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    price: Decimal = Field(..., ge=0)
    image_url: Optional[HttpUrl] = None
    category_name: Optional[str] = Field(None, max_length=100)
    score: Optional[float] = Field(None, ge=0, le=1)

    class Config:
        json_encoders = {
            Decimal: str,
            UUID: str
        }

class SearchResponse(BaseModel):
    """Response model for search results."""
    products: List[Product]
    total: int = Field(..., ge=0)

class RecommendationResponse(BaseModel):
    """Response model for product recommendations."""
    recommendations: List[Product]
    total: int = Field(..., ge=0)

class AdminRebuildResponse(BaseModel):
    """Response model for embedding rebuild request."""
    status: str = Field(..., description="Status of the rebuild request")
    message: str = Field(..., description="Message describing the rebuild status")
    task_id: str = Field(..., description="ID of the rebuild task")

class AdminTaskResponse(BaseModel):
    """Response model for admin task status."""
    task_id: str = Field(..., description="Unique identifier for the task")
    task_type: str = Field(..., description="Type of the task (e.g., rebuild_embeddings)")
    status: str = Field(..., description="Current status of the task")
    start_time: datetime = Field(..., description="When the task started")
    end_time: Optional[datetime] = Field(None, description="When the task ended (if completed or failed)")
    error: Optional[str] = Field(None, description="Error message if task failed")

class AdminTaskListResponse(BaseModel):
    """Response model for list of admin tasks."""
    tasks: List[AdminTaskResponse] = Field(..., description="List of tasks")
    total: int = Field(..., description="Total number of tasks") 