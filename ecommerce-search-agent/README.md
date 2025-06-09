# E-commerce Search Agent

A modern, AI-powered search and recommendation backend for e-commerce platforms. Supports natural language, image+text, and vector-based product search, with fast caching and scalable architecture.

## Features
- Natural language product search (text)
- Image+text product search (OpenAI Vision)
- Product recommendations (vector similarity)
- FastAPI backend with async support
- PostgreSQL, Redis, and ChromaDB integration
- Caching for search and recommendations
- Admin endpoint for rebuilding embeddings
- Dockerized for easy deployment

## Requirements
- Python 3.11 (strict requirement)
- Docker and Docker Compose
- OpenAI API key
- PostgreSQL 15+
- Redis 7+
- ChromaDB latest
- uv package manager (for dependency management)

## Project Structure
```
ecommerce-search-agent/
├── src/
│   ├── agents/           # Search, image, and recommendation agents
│   ├── api/              # FastAPI routes and models
│   ├── chains/           # Query understanding and SQL generation chains
│   ├── database/         # DB models and clients
│   ├── embeddings/       # Embedding generator and indexer
│   ├── utils/            # Logging, validators, etc.
│   └── main.py           # FastAPI app entry point
├── scripts/              # Utility scripts (e.g., rebuild_embeddings.py)
├── tests/                # Unit and integration tests
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── .env.example
└── README.md
```

## Quick Start
1. **Clone the repo:**
   ```bash
   git clone <repo-url>
   cd ecommerce-search-agent
   ```

2. **Set up environment:**
   ```bash
   # Copy environment variables
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Install dependencies:**
   ```bash
   # Install uv package manager (if not already installed)
   curl -LsSf https://astral.sh/uv/install.sh | sh
   
   # Create and activate virtual environment
   uv venv
   source .venv/bin/activate  # On Unix/macOS
   # or
   .venv\Scripts\activate  # On Windows
   
   # Install project dependencies
   uv pip install -r requirements.txt
   ```

4. **Start services:**
   ```bash
   # Start all services
   docker-compose up -d
   ```

5. **Initialize the database:**
   ```bash
   # Run database migrations
   docker-compose exec app alembic upgrade head
   ```

6. **Start the application:**
   ```bash
   # Make sure you're in the virtual environment
   source .venv/bin/activate  # On Unix/macOS
   # or
   .venv\Scripts\activate  # On Windows
   
   # Start the application
   uv run uvicorn src.main:app --host 0.0.0.0 --port 9000 --reload
   ```

## API Documentation

### Search Endpoints

#### Text Search
```http
POST /search/text
Content-Type: application/json

{
    "query": "red sporty watch with rubber strap"
}
```

#### Image Search
```http
POST /search/image
Content-Type: application/json

{
    "image_base64": "base64_encoded_image_data",
    "query": "optional text query"
}
```

#### Product Recommendations
```http
GET /recommendations/{product_id}
```

### Admin Endpoints

#### Rebuild Embeddings
```http
POST /admin/rebuild-embeddings
```

## Development

### Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src tests/
```

### Code Quality
```bash
# Format code
black .

# Sort imports
isort .

# Lint code
ruff check .

# Type checking
mypy src/
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check if PostgreSQL is running: `docker-compose ps`
   - Verify connection settings in `.env`
   - Check logs: `docker-compose logs postgres`

2. **Redis Connection Issues**
   - Verify Redis is running: `docker-compose ps`
   - Check connection settings in `.env`
   - Check logs: `docker-compose logs redis`

3. **ChromaDB Issues**
   - Ensure ChromaDB is running: `docker-compose ps`
   - Check connection settings in `.env`
   - Check logs: `docker-compose logs chromadb`

4. **OpenAI API Issues**
   - Verify API key in `.env`
   - Check rate limits and quota
   - Verify model availability

### Logs
- Application logs: `docker-compose logs app`
- Database logs: `docker-compose logs postgres`
- Redis logs: `docker-compose logs redis`
- ChromaDB logs: `docker-compose logs chromadb`

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
MIT 

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

   Ensure your `.env` file contains the following configuration:

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

4. **Start the FastAPI Application**

   Run the following command to start the FastAPI application:

   ```bash
   uv run uvicorn src.main:app --host 0.0.0.0 --port 9000 --reload
   ```

   Your application should now be running and connected to the Docker containers. 