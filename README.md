# E-commerce Platform with AI-Powered Search

A modern, full-stack e-commerce platform featuring an AI-powered search and recommendation system. Built with Next.js, Node.js/Express, and Python FastAPI, integrating natural language processing, image search capabilities, and intelligent product recommendations.
 

## 🚀 Features

### Core E-commerce Features
- **Product Catalog Management** - Full CRUD operations for products and categories
- **User Authentication & Authorization** - Secure JWT-based auth system
- **Shopping Cart & Checkout** - Complete shopping experience
- **Order Management** - Order tracking and history
- **Customer Reviews & Ratings** - Product feedback system
- **Admin Dashboard** - Administrative tools for content management

### AI-Powered Search & Recommendations
- **Natural Language Search** - Search using conversational queries
- **Image + Text Search** - Combined visual and textual search capabilities (OpenAI Vision)
- **Vector-based Product Search** - Semantic search using embeddings
- **Intelligent Recommendations** - AI-driven product suggestions with vector similarity
- **Real-time Search** - Fast, cached search results with Redis
- **Admin Embedding Management** - Rebuild search index capabilities
- **Dockerized Services** - Easy deployment with PostgreSQL, ChromaDB, and Redis containers

## 🏗️ Architecture

### Frontend (`/frontend`)
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons, Lucide React
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

### Backend (`/backend`)
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **File Upload**: Cloudinary integration
- **Email**: Mailgun integration
- **Development**: TypeScript, Nodemon

### AI Search Agent (`/ecommerce-search-agent`)
- **Framework**: FastAPI with Python 3.11
- **Vector Database**: ChromaDB
- **Caching**: Redis
- **AI/ML**: OpenAI, LangChain, LangGraph
- **Search**: Semantic embeddings and natural language processing

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** 3.11 (strict requirement for search agent)
- **PostgreSQL** database
- **Redis** server
- **ChromaDB** service
- **uv** (Python package manager)
- **npm** or **yarn**
- **Docker** (recommended for services)
- **OpenAI API Key** (for AI search features)

## 🚀 Quick Start

### Option 1: Docker Setup (Recommended)

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd 350
```

#### 2. Start Docker Services
```bash
# Clean up any existing containers
docker rm -f postgres chromadb redis || true

# Start PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 5434:5432 postgres:latest

# Start ChromaDB
docker run -d --name chromadb \
  -p 8001:8000 chromadb/chroma:latest

# Start Redis
docker run -d --name redis \
  -p 6380:6379 redis:latest
```

#### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and API keys

# Run database migrations
npm run db:migrate

# Seed the database
npm run db:seed

# Start development server
npm run dev
```

#### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit with backend API URL

# Start development server
npm run dev
```

#### 5. AI Search Agent Setup
```bash
cd ecommerce-search-agent

# Install Python dependencies using uv
pip install uv
uv pip install -r requirements.txt

# Configure environment variables (see .env example below)
cp .env.example .env
# Edit with database and API credentials

# Seed the database (if not done from backend)
python tests/seed_postgres.py

# Start the search agent
uv run uvicorn src.main:app --host 0.0.0.0 --port 9000 --reload
```

### Option 2: Backend Integration Setup

#### 1. Ensure Backend is Running
```bash
cd backend
npm run dev
```

#### 2. Run Integration Setup
```bash
cd ecommerce-search-agent
./scripts/setup_backend_integration.sh
```

#### 3. Verify Integration
```bash
python scripts/verify_integration.py
```

#### 4. Start Search Agent
```bash
python -m src.main
```

### Option 3: Manual Setup

#### Setting Up Python 3.11
```bash
# Install Python 3.11 (Ubuntu/Debian)
sudo apt update
sudo apt install python3.11 python3.11-venv

# Create virtual environment
python3.11 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Verify Python version
python --version  # Should show Python 3.11.x

# Install dependencies
uv pip install -r requirements.txt
```

## 🔧 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/ecommerce_db"
JWT_SECRET="your-jwt-secret"
CLOUDINARY_CLOUD_NAME="your-cloudinary-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
MAILGUN_API_KEY="your-mailgun-key"
MAILGUN_DOMAIN="your-domain"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_SEARCH_API_URL="http://localhost:9000"
```

### Search Agent (.env)
```env
# Application Settings
APP_NAME=ecommerce-search-agent
APP_ENV=development
LOG_LEVEL=INFO
API_PORT=9000

# Database (PostgreSQL)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/postgres"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_DB=0
REDIS_URL="redis://localhost:6380"

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8001
CHROMADB_HOST=localhost
CHROMADB_PORT=8001

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Cache Settings
CACHE_TTL=3600
EMBEDDING_CACHE_TTL=86400

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600

# CORS
CORS_ORIGINS="*"
CORS_METHODS="*"
CORS_HEADERS="*"
```

## 📡 API Endpoints

### Backend API (Port 3001)
- `GET /api/products` - Get all products
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/categories` - Get categories
- `POST /api/cart` - Add to cart
- `GET /api/orders` - Get user orders

### Search Agent API (Port 9000)
- `POST /search/text` - Natural language search
- `POST /search/image` - Image + text search
- `GET /recommendations/{user_id}` - Get recommendations
- `POST /admin/rebuild-index` - Rebuild search index

#### Example Search Request
```bash
# Text search
curl -X POST http://localhost:9000/search/text \
  -H "Content-Type: application/json" \
  -d '{"query": "headphones"}'

# Image + text search
curl -X POST http://localhost:9000/search/image \
  -H "Content-Type: application/json" \
  -d '{"query": "wireless headphones", "image_url": "https://example.com/image.jpg"}'
```

## 🗄️ Database Schema

Key models include:
- **Users** - Customer and admin accounts
- **Products** - Product catalog with specifications
- **Categories** - Product categorization
- **Orders** - Order management and tracking
- **Reviews** - Customer feedback system
- **Cart** - Shopping cart functionality

## 🐳 Docker Management

### Managing Docker Containers

#### Stop Containers
```bash
docker stop postgres chromadb redis
```

#### Remove Containers
```bash
docker rm postgres chromadb redis
```

#### Clean Restart (if ports are in use)
```bash
# Force remove existing containers
docker rm -f postgres chromadb redis || true

# Restart all containers
docker run -d --name postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres -p 5434:5432 postgres:latest
docker run -d --name chromadb -p 8001:8000 chromadb/chroma:latest
docker run -d --name redis -p 6380:6379 redis:latest
```

#### Check Container Status
```bash
docker ps -a
```

#### View Container Logs
```bash
docker logs postgres
docker logs chromadb
docker logs redis
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Search Agent Tests
```bash
cd ecommerce-search-agent
python -m pytest tests/
```

### Integration Testing
```bash
cd ecommerce-search-agent

# Test database connection
python scripts/check_db_connection.py

# Test search integration
python scripts/test_search_integration.py

# Verify full integration
python scripts/verify_integration.py
```

## 🔧 Troubleshooting

### Common Issues

#### Python Dependencies
If you encounter missing dependencies:
```bash
cd ecommerce-search-agent
uv pip install -r requirements.txt
```

#### Port Conflicts
If ports are already in use:
```bash
# Check what's using the ports
lsof -i :5434  # PostgreSQL
lsof -i :8001  # ChromaDB  
lsof -i :6380  # Redis
lsof -i :9000  # Search Agent

# Kill processes or use Docker cleanup
docker rm -f postgres chromadb redis || true
```

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
cd ecommerce-search-agent
python scripts/check_db_connection.py
```

#### Search Agent Not Starting
```bash
# Check Python version
python --version  # Should be 3.11.x

# Rebuild dependencies
cd ecommerce-search-agent
rm -rf .venv
python3.11 -m venv .venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

### Fast Setup Script
```bash
#!/bin/bash
# Save as setup.sh and run: chmod +x setup.sh && ./setup.sh

# Clean up existing containers
docker rm -f postgres chromadb redis || true

# Start services
docker run -d --name postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres -p 5434:5432 postgres:latest
docker run -d --name chromadb -p 8001:8000 chromadb/chroma:latest
docker run -d --name redis -p 6380:6379 redis:latest

# Wait for services to start
sleep 10

# Seed database
cd ecommerce-search-agent
python tests/seed_postgres.py

echo "Setup complete! Services running on:"
echo "- PostgreSQL: localhost:5434"
echo "- ChromaDB: localhost:8001"  
echo "- Redis: localhost:6380"
```

## 📝 Development Scripts

### Backend Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database (⚠️ destructive)

### Frontend Scripts
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Search Agent Scripts
- `python -m src.main` - Start search service
- `uv run uvicorn src.main:app --host 0.0.0.0 --port 9000 --reload` - Start with uvicorn
- `python scripts/rebuild_embeddings.py` - Rebuild search embeddings
- `python scripts/test_integration.py` - Test backend integration
- `python scripts/seed_postgres.py` - Seed database
- `python scripts/setup_backend_integration.sh` - Setup integration
- `python scripts/verify_integration.py` - Verify setup

### Useful Maintenance Scripts
```bash
# Rebuild search index
cd ecommerce-search-agent
python scripts/rebuild_embeddings.py

# Sync data from backend
python scripts/sync_backend_data.py

# Migrate ChromaDB
python scripts/migrate_chromadb.py

# Test ChromaDB directly
python scripts/test_chromadb_direct.py
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🔗 Related Documentation
 
- [Search Agent Documentation](./ecommerce-search-agent/README.md) 
