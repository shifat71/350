#!/bin/bash

# Setup script for ecommerce search agent backend integration
# This script sets up the search agent to use the backend's database

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Setting up ecommerce search agent backend integration...${NC}"

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ Error: Please run this script from the ecommerce-search-agent directory${NC}"
    exit 1
fi

# Check if backend is running
echo -e "${YELLOW}📡 Checking if backend is running...${NC}"
if ! curl -s http://localhost:3001/api/products > /dev/null; then
    echo -e "${RED}❌ Backend is not running. Please start the backend first:${NC}"
    echo "cd ../backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"

# Install Python dependencies
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
if command -v uv &> /dev/null; then
    uv pip install -r requirements.txt
else
    pip install -r requirements.txt
fi

# Check environment variables
echo -e "${YELLOW}🔍 Checking environment variables...${NC}"
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_USER" ]; then
    echo -e "${YELLOW}⚠️  No database environment variables found. Using defaults...${NC}"
    export POSTGRES_USER=postgres
    export POSTGRES_PASSWORD=postgres
    export POSTGRES_HOST=localhost
    export POSTGRES_PORT=5432
    export POSTGRES_DB=postgres
fi

# Sync data from backend database
echo -e "${YELLOW}🔄 Syncing data from backend database...${NC}"
python scripts/sync_backend_data.py

echo -e "${GREEN}✨ Backend integration setup completed successfully!${NC}"
echo ""
echo -e "${GREEN}🚀 You can now start the search agent with:${NC}"
echo "python -m src.main"
echo ""
echo -e "${GREEN}📖 API will be available at:${NC}"
echo "- Text Search: http://localhost:9000/search/text"
echo "- Image Search: http://localhost:9000/search/image"
echo "- Recommendations: http://localhost:9000/recommendations/{product_id}"
