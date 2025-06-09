#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Starting setup process..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
POSTGRES_USER=ecommerce
POSTGRES_PASSWORD=ecommerce123
POSTGRES_DB=ecommerce
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

CHROMA_HOST=localhost
CHROMA_PORT=8000

OPENAI_API_KEY=your_openai_key
EOL
    echo -e "${GREEN}✓ Created .env file${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose down -v
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Test PostgreSQL connection
echo "🔍 Testing PostgreSQL connection..."
if docker-compose exec postgres pg_isready -U ecommerce -d ecommerce; then
    echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
else
    echo -e "${RED}✗ PostgreSQL connection failed${NC}"
    exit 1
fi

# Test Redis connection
echo "🔍 Testing Redis connection..."
if docker-compose exec redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✓ Redis is ready${NC}"
else
    echo -e "${RED}✗ Redis connection failed${NC}"
    exit 1
fi

# Test ChromaDB connection
echo "🔍 Testing ChromaDB connection..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v2/heartbeat | grep -q "200"; then
    echo -e "${GREEN}✓ ChromaDB is ready${NC}"
else
    echo -e "${RED}✗ ChromaDB connection failed${NC}"
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
uv pip install -r requirements.txt

# Initialize the database
echo "🗃️ Initializing database..."
python -c "
from src.database.postgres import init_db
import asyncio
asyncio.run(init_db())
"

echo -e "${GREEN}✨ Setup completed successfully!${NC}"
echo "You can now run the application with: uv run python src/main.py" 