import pytest
from httpx import AsyncClient
from src.main import app

@pytest.mark.asyncio
async def test_text_search(monkeypatch):
    async def mock_search(self, query, chat_history=None, limit=20):
        return {"products": [{"id": "1", "name": "Test Product"}], "total": 1}
    monkeypatch.setattr("src.agents.search_agent.SearchAgent.search", mock_search)
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/search/text", json={"query": "test"})
        assert response.status_code == 200
        data = response.json()
        assert data["products"][0]["id"] == "1"
        assert data["total"] == 1

@pytest.mark.asyncio
async def test_image_search(monkeypatch):
    async def mock_search(self, image_base64, query=None):
        return {"products": [{"id": "1", "name": "Test Product"}], "total": 1}
    monkeypatch.setattr("src.agents.image_agent.ImageAgent.search", mock_search)
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/search/image", json={"image_base64": "aGVsbG8=", "query": "test"})
        assert response.status_code == 200
        data = response.json()
        assert data["products"][0]["id"] == "1"
        assert data["total"] == 1

@pytest.mark.asyncio
async def test_recommendations(monkeypatch):
    async def mock_recommend(self, product_id):
        return {"recommendations": [{"id": "2", "name": "Recommended Product"}], "total": 1}
    monkeypatch.setattr("src.agents.recommendation_agent.RecommendationAgent.recommend", mock_recommend)
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/recommendations/1")
        assert response.status_code == 200
        data = response.json()
        assert data["recommendations"][0]["id"] == "2"
        assert data["total"] == 1

@pytest.mark.asyncio
async def test_admin_rebuild_embeddings(monkeypatch):
    async def mock_main():
        return None
    monkeypatch.setattr("scripts.rebuild_embeddings.main", mock_main)
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/admin/rebuild-embeddings")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok" 