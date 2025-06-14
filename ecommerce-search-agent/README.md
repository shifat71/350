# E-commerce Search Agent

A modern, AI-powered search and recommendation backend for e-commerce platforms. Supports natural language, image+text, and vector-based product search, with fast caching and scalable architecture.

**🔄 UPDATED: Now integrated with backend database!**

This search agent now uses the same PostgreSQL database as the backend, ensuring consistent product data between search results and product pages.

## Requirements
- Python 3.11 (strict requirement)
- uv
- Backend database running and seeded
- ChromaDB and Redis services

## Quick Setup (Backend Integration)

1. **Ensure backend is running**:
   ```bash
   cd ../backend
   npm run dev
   ```

2. **Run the integration setup**:
   ```bash
   cd ecommerce-search-agent
   ./scripts/setup_backend_integration.sh
   ```

3. **Verify the integration**:
   ```bash
   python scripts/verify_integration.py
   ```

4. **Start the search agent**:
   ```bash
   python -m src.main
   ```

## Manual Setup

## Setting Up Python 3.11

To ensure compatibility and avoid errors, you must use Python 3.11. Follow these steps:

1. **Install Python 3.11** (if not already installed):
   ```bash
   sudo apt update
   sudo apt install python3.11 python3.11-venv
   ```

2. **Create a virtual environment with Python 3.11**:
   ```bash
   python3.11 -m venv .venv
   ```

3. **Activate the virtual environment**:
   ```bash
   source .venv/bin/activate
   ```

4. **Verify Python version**:
   ```bash
   python --version
   ```
   Ensure it shows `Python 3.11.x`.

5. **Install dependencies**:
   ```bash
   uv pip install -r requirements.txt
   ```

## Features
- Natural language product search (text)
- Image+text product search (OpenAI Vision)
- Product recommendations (vector similarity)
- FastAPI backend with async support
- PostgreSQL, Redis, and ChromaDB integration
- Caching for search and recommendations
- Admin endpoint for rebuilding embeddings
- Dockerized for easy deployment

## Running the Project with Docker Containers

This project uses Docker containers for PostgreSQL, ChromaDB, and Redis. Follow these steps to run the project:

1. **Pull the Docker Images**

   Run the following command to pull the latest images:
   ```bash
   docker pull postgres:latest
   docker pull chromadb/chroma:latest
   docker pull redis:latest
   ```

2. **Run the Containers**

   Start PostgreSQL, ChromaDB, and Redis containers with the following commands:

   ```bash
   # PostgreSQL
   docker run -d --name postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres -p 5434:5432 postgres:latest

   # ChromaDB
   docker run -d --name chromadb -p 8001:8000 chromadb/chroma:latest

   # Redis
   docker run -d --name redis -p 6380:6379 redis:latest
   ```

3. **Update Your .env File**

   Ensure your `.env` file contains the following configuration. If the file does not exist, create it in the root directory of the project:

   ```
   APP_NAME=ecommerce-search-agent
   APP_ENV=development
   LOG_LEVEL=INFO
   API_PORT=9000

   # Database
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=postgres
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5434

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6380
   REDIS_DB=0

   # ChromaDB
   CHROMA_HOST=localhost
   CHROMA_PORT=8001

   # OpenAI
   OPENAI_API_KEY=your_openai_api_key

   # Cache
   CACHE_TTL=3600
   EMBEDDING_CACHE_TTL=86400

   # Rate Limiting
   RATE_LIMIT_REQUESTS=100
   RATE_LIMIT_WINDOW=3600
   ```

4. **Managing Docker Containers**

   If you need to stop or remove the Docker containers, you can use the following commands:

   ```bash
   # Stop containers
   docker stop postgres chromadb redis

   # Remove containers
   docker rm postgres chromadb redis
   ```

5. **Testing the Application**

   Once the application is running, you can test it by accessing the API endpoints. For example, to search for products, you can use:

   ```bash
   curl -X POST http://localhost:9000/search/text -H "Content-Type: application/json" -d '{"query": "headphones"}'
   ```

   This will return a list of products matching the search query.

## Fast Setup & Troubleshooting

### 1. Install dependencies (robust)
```bash
uv pip install -r requirements.txt
```


### 2. Clean up Docker containers (if ports are in use or containers already exist)
```bash
docker rm -f postgres chromadb redis || true
```

### 3. Start Docker containers
```bash
docker run -d --name postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres -p 5434:5432 postgres:latest
docker run -d --name chromadb -p 8001:8000 chromadb/chroma:latest
docker run -d --name redis -p 6380:6379 redis:latest
```

### 4. Seed the database
```bash
python run tests/seed_postgres.py
```

### 5. Start the FastAPI app
```bash
uv run uvicorn src.main:app --host 0.0.0.0 --port 9000 --reload
```

---

If you encounter errors about missing dependencies, repeat step 1. If you see port conflicts, repeat step 2. 