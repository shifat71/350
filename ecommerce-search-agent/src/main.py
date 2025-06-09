import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.utils.logger import configure_logging

from src.api.routes import search, recommendation, admin

configure_logging()

app = FastAPI(title=os.environ["APP_NAME"])

# CORS (allow all origins for now)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(recommendation.router, prefix="/recommendations", tags=["recommendation"])
app.include_router(admin.router, prefix="/admin", tags=["admin"]) 