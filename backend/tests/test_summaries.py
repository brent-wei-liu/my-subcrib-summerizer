"""Tests for summaries API."""

import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

from app.services.llm import LlmResponse


class TestListSummaries:
    def test_empty(self, client):
        resp = client.get("/api/v1/summaries")
        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0

    def test_returns_summaries(self, client, isolated_data_dir):
        from app.routers.summaries import summaries_store
        sid = str(uuid.uuid4())
        now = datetime.utcnow()
        summaries_store.write([{
            "id": sid,
            "created_at": now.isoformat(),
            "period_start": (now - timedelta(days=7)).isoformat(),
            "period_end": now.isoformat(),
            "source_ids": [str(uuid.uuid4())],
            "article_count": 10,
            "llm_provider": "claude",
            "llm_model": "claude-sonnet-4-20250514",
            "content": "## Summary\nTest content",
            "prompt_tokens": 100,
            "completion_tokens": 50,
        }])
        resp = client.get("/api/v1/summaries")
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["id"] == sid

    def test_pagination(self, client, isolated_data_dir):
        from app.routers.summaries import summaries_store
        now = datetime.utcnow()
        items = []
        for i in range(5):
            items.append({
                "id": str(uuid.uuid4()),
                "created_at": (now - timedelta(hours=i)).isoformat(),
                "period_start": (now - timedelta(days=7)).isoformat(),
                "period_end": now.isoformat(),
                "source_ids": [],
                "article_count": i,
                "llm_provider": "claude",
                "llm_model": "test",
                "content": f"Content {i}",
            })
        summaries_store.write(items)

        resp = client.get("/api/v1/summaries?limit=2&offset=0")
        assert len(resp.json()["items"]) == 2
        assert resp.json()["total"] == 5


class TestGetSummary:
    def test_found(self, client, isolated_data_dir):
        from app.routers.summaries import summaries_store
        sid = str(uuid.uuid4())
        now = datetime.utcnow()
        summaries_store.write([{
            "id": sid,
            "created_at": now.isoformat(),
            "period_start": (now - timedelta(days=7)).isoformat(),
            "period_end": now.isoformat(),
            "source_ids": [],
            "article_count": 5,
            "llm_provider": "claude",
            "llm_model": "test",
            "content": "Test",
        }])
        resp = client.get(f"/api/v1/summaries/{sid}")
        assert resp.status_code == 200

    def test_not_found(self, client):
        resp = client.get(f"/api/v1/summaries/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestDeleteSummary:
    def test_success(self, client, isolated_data_dir):
        from app.routers.summaries import summaries_store
        sid = str(uuid.uuid4())
        now = datetime.utcnow()
        summaries_store.write([{
            "id": sid,
            "created_at": now.isoformat(),
            "period_start": (now - timedelta(days=7)).isoformat(),
            "period_end": now.isoformat(),
            "source_ids": [],
            "article_count": 0,
            "llm_provider": "claude",
            "llm_model": "test",
            "content": "Delete me",
        }])
        resp = client.delete(f"/api/v1/summaries/{sid}")
        assert resp.status_code == 204

        resp = client.get(f"/api/v1/summaries/{sid}")
        assert resp.status_code == 404

    def test_not_found(self, client):
        resp = client.delete(f"/api/v1/summaries/{uuid.uuid4()}")
        assert resp.status_code == 404


class TestGenerateSummary:
    def test_no_articles_returns_400(self, client):
        resp = client.post("/api/v1/summaries/generate", json={"since_days": 7})
        assert resp.status_code == 400

    def test_success_with_mock_llm(self, client, created_source, isolated_data_dir):
        # Add articles for the source
        from app.routers.articles import articles_store
        source_id = created_source["id"]
        now = datetime.utcnow()
        articles_store.write([{
            "id": str(uuid.uuid4()),
            "source_id": source_id,
            "title": f"Article {i}",
            "url": f"https://example.com/{i}",
            "published_at": (now - timedelta(hours=i)).isoformat(),
            "fetched_at": now.isoformat(),
            "content_snippet": f"Content {i}",
            "guid": f"guid-{i}",
        } for i in range(3)])

        mock_response = LlmResponse(
            content="## Trends\n\nTest summary content",
            prompt_tokens=500,
            completion_tokens=200,
        )

        with patch("app.services.summarizer.call_llm", new_callable=AsyncMock, return_value=mock_response):
            resp = client.post("/api/v1/summaries/generate", json={
                "source_ids": [source_id],
                "since_days": 7,
            })

        assert resp.status_code == 200
        body = resp.json()
        assert body["article_count"] == 3
        assert body["content"] == "## Trends\n\nTest summary content"
        assert body["prompt_tokens"] == 500
        assert body["completion_tokens"] == 200
        assert source_id in body["source_ids"]

    def test_cross_source_mode(self, client, isolated_data_dir):
        # Create two sources
        s1 = client.post("/api/v1/sources", json={
            "name": "Source A", "url": "https://a.com/rss"
        }).json()
        s2 = client.post("/api/v1/sources", json={
            "name": "Source B", "url": "https://b.com/rss"
        }).json()

        from app.routers.articles import articles_store
        now = datetime.utcnow()
        articles_store.write([
            {"id": str(uuid.uuid4()), "source_id": s1["id"], "title": "A1",
             "url": "https://a.com/1", "published_at": now.isoformat(),
             "fetched_at": now.isoformat(), "content_snippet": "From A", "guid": "ga1"},
            {"id": str(uuid.uuid4()), "source_id": s2["id"], "title": "B1",
             "url": "https://b.com/1", "published_at": now.isoformat(),
             "fetched_at": now.isoformat(), "content_snippet": "From B", "guid": "gb1"},
        ])

        mock_response = LlmResponse(content="Cross-source summary", prompt_tokens=100, completion_tokens=50)

        with patch("app.services.summarizer.call_llm", new_callable=AsyncMock, return_value=mock_response):
            resp = client.post("/api/v1/summaries/generate", json={"since_days": 7})

        assert resp.status_code == 200
        body = resp.json()
        assert body["article_count"] == 2
        assert len(body["source_ids"]) == 2
