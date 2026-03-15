"""Tests for articles API."""

import uuid
from datetime import datetime, timedelta

from app.services.storage import JsonStore


class TestListArticles:
    def test_empty(self, client):
        resp = client.get("/api/v1/articles")
        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["limit"] == 50
        assert body["offset"] == 0

    def test_returns_articles(self, client, isolated_data_dir):
        from app.routers.articles import articles_store
        source_id = str(uuid.uuid4())
        articles_store.write([
            {
                "id": str(uuid.uuid4()),
                "source_id": source_id,
                "title": "Article 1",
                "url": "https://example.com/1",
                "author": "Author",
                "published_at": "2026-03-15T10:00:00",
                "fetched_at": "2026-03-15T12:00:00",
                "content_snippet": "Snippet",
                "guid": "guid-1",
            }
        ])
        resp = client.get("/api/v1/articles")
        assert resp.status_code == 200
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["title"] == "Article 1"

    def test_filter_by_source_id(self, client, isolated_data_dir):
        from app.routers.articles import articles_store
        sid1 = str(uuid.uuid4())
        sid2 = str(uuid.uuid4())
        articles_store.write([
            {"id": str(uuid.uuid4()), "source_id": sid1, "title": "A1", "url": "https://a.com/1",
             "fetched_at": "2026-03-15T12:00:00", "guid": "g1"},
            {"id": str(uuid.uuid4()), "source_id": sid2, "title": "A2", "url": "https://a.com/2",
             "fetched_at": "2026-03-15T12:00:00", "guid": "g2"},
        ])
        resp = client.get(f"/api/v1/articles?source_id={sid1}")
        assert resp.json()["total"] == 1
        assert resp.json()["items"][0]["title"] == "A1"

    def test_pagination(self, client, isolated_data_dir):
        from app.routers.articles import articles_store
        sid = str(uuid.uuid4())
        articles = []
        for i in range(5):
            articles.append({
                "id": str(uuid.uuid4()), "source_id": sid,
                "title": f"Art {i}", "url": f"https://a.com/{i}",
                "fetched_at": f"2026-03-15T{10+i:02d}:00:00", "guid": f"g{i}",
            })
        articles_store.write(articles)

        resp = client.get("/api/v1/articles?limit=2&offset=0")
        body = resp.json()
        assert body["total"] == 5
        assert len(body["items"]) == 2

        resp2 = client.get("/api/v1/articles?limit=2&offset=2")
        body2 = resp2.json()
        assert len(body2["items"]) == 2
        assert body2["items"][0]["title"] != body["items"][0]["title"]


class TestGetArticle:
    def test_found(self, client, isolated_data_dir):
        from app.routers.articles import articles_store
        aid = str(uuid.uuid4())
        articles_store.write([{
            "id": aid, "source_id": str(uuid.uuid4()),
            "title": "Found", "url": "https://a.com/1",
            "fetched_at": "2026-03-15T12:00:00", "guid": "g1",
        }])
        resp = client.get(f"/api/v1/articles/{aid}")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Found"

    def test_not_found(self, client):
        resp = client.get(f"/api/v1/articles/{uuid.uuid4()}")
        assert resp.status_code == 404
