from typing import List, Optional, Any
from pydantic import BaseModel, Field

class TextSearchRequest(BaseModel):
    query: str = Field(..., description="User's search query")

class ImageSearchRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded image data")
    query: Optional[str] = Field(None, description="Optional text to accompany the image")

class Product(BaseModel):
    id: str
    name: str
    description: Optional[str]
    price: float
    image_url: Optional[str]
    category_name: Optional[str]
    score: Optional[float]

class SearchResponse(BaseModel):
    products: List[Product]
    total: int

class RecommendationResponse(BaseModel):
    recommendations: List[Product]
    total: int

class AdminRebuildResponse(BaseModel):
    status: str
    message: str 