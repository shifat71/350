import os
from typing import List
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.utils.logger import configure_logging, get_logger

from src.api.routes import search, recommendation, admin

# Load environment variables
load_dotenv()

# Configure logging
configure_logging()
logger = get_logger(__name__)

def get_required_env_var(name: str) -> str:
    """Get a required environment variable or raise an error."""
    value = os.environ.get(name)
    if not value:
        raise ValueError(f"Required environment variable {name} is not set")
    return value

# Get CORS configuration from environment
CORS_ORIGINS: List[str] = os.environ.get("CORS_ORIGINS", "*").split(",")
CORS_METHODS: List[str] = os.environ.get("CORS_METHODS", "*").split(",")
CORS_HEADERS: List[str] = os.environ.get("CORS_HEADERS", "*").split(",")

# Initialize FastAPI app
try:
    app = FastAPI(
        title=get_required_env_var("APP_NAME"),
        description="AI-powered e-commerce search and recommendation API",
        version="1.0.0",
    )
except ValueError as e:
    logger.error("Failed to initialize FastAPI app", error=str(e))
    raise

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=CORS_METHODS,
    allow_headers=CORS_HEADERS,
)

# Include routers
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(recommendation.router, prefix="/recommendations", tags=["recommendation"])
app.include_router(admin.router, prefix="/admin", tags=["admin"]) 