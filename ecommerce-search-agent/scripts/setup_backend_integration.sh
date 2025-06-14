#!/bin/bash

# Setup script for migrating ecommerce-search-agent to use backend database

set -e

echo "🔄 Setting up ecommerce-search-agent to use backend database..."

# Check if we're in the correct directory
if [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: Please run this script from the ecommerce-search-agent directory"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your actual configuration values"
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing Python dependencies..."
if command -v uv &> /dev/null; then
    uv sync
else
    pip install -r requirements.txt
fi

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "🔌 Activating virtual environment..."
    source .venv/bin/activate
fi

# Check if backend database is running
echo "🔍 Checking backend database connection..."
python scripts/check_db_connection.py

if [ $? -ne 0 ]; then
    echo "❌ Cannot proceed without backend database connection"
    echo "   Please ensure the backend is running and the database is seeded"
    exit 1
fi

# Run the backend data seeding script
echo "🌱 Setting up vector search on backend database..."
source .venv/bin/activate
python scripts/seed_backend_data.py

if [ $? -ne 0 ]; then
    echo "❌ Failed to set up vector search on backend database"
    exit 1
fi

# Migrate ChromaDB data
echo "🔄 Migrating ChromaDB to use backend product IDs..."
python scripts/migrate_chromadb.py

if [ $? -ne 0 ]; then
    echo "❌ Failed to migrate ChromaDB data"
    exit 1
fi

echo "✅ Setup completed successfully!"
echo ""
echo "🎉 The ecommerce-search-agent is now configured to use the backend database!"
echo ""
echo "Next steps:"
echo "1. Start the search agent server: python -m src.main"
echo "2. Test the search functionality"
echo "3. Verify that search results show the same products as the backend"
echo ""
echo "Note: Make sure ChromaDB and Redis are running before starting the search agent."
