"""Tests for sources CRUD API."""

import uuid


class TestListSources:
    def test_empty(self, client):
        resp = client.get("/api/v1/sources")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_created_sources(self, client, created_source):
        resp = client.get("/api/v1/sources")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Feed"


class TestCreateSource:
    def test_success(self, client, sample_source):
        resp = client.post("/api/v1/sources", json=sample_source)
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Test Feed"
        assert body["url"] == "https://example.com/rss"
        assert body["category"] == "tech"
        assert body["enabled"] is True
        assert body["id"] is not None
        assert body["created_at"] is not None
        assert body["last_fetched_at"] is None

    def test_defaults(self, client):
        resp = client.post("/api/v1/sources", json={
            "name": "Minimal",
            "url": "https://example.com/feed",
        })
        assert resp.status_code == 201
        body = resp.json()
        assert body["category"] == "general"
        assert body["enabled"] is True

    def test_missing_name(self, client):
        resp = client.post("/api/v1/sources", json={"url": "https://example.com/rss"})
        assert resp.status_code == 422

    def test_missing_url(self, client):
        resp = client.post("/api/v1/sources", json={"name": "No URL"})
        assert resp.status_code == 422

    def test_invalid_url(self, client):
        resp = client.post("/api/v1/sources", json={
            "name": "Bad",
            "url": "not-a-url",
        })
        assert resp.status_code == 422


class TestGetSource:
    def test_found(self, client, created_source):
        sid = created_source["id"]
        resp = client.get(f"/api/v1/sources/{sid}")
        assert resp.status_code == 200
        assert resp.json()["id"] == sid

    def test_not_found(self, client):
        fake_id = str(uuid.uuid4())
        resp = client.get(f"/api/v1/sources/{fake_id}")
        assert resp.status_code == 404


class TestUpdateSource:
    def test_update_name(self, client, created_source):
        sid = created_source["id"]
        resp = client.put(f"/api/v1/sources/{sid}", json={"name": "Updated"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated"
        assert resp.json()["category"] == "tech"  # unchanged

    def test_update_enabled(self, client, created_source):
        sid = created_source["id"]
        resp = client.put(f"/api/v1/sources/{sid}", json={"enabled": False})
        assert resp.status_code == 200
        assert resp.json()["enabled"] is False

    def test_not_found(self, client):
        fake_id = str(uuid.uuid4())
        resp = client.put(f"/api/v1/sources/{fake_id}", json={"name": "X"})
        assert resp.status_code == 404

    def test_updated_at_changes(self, client, created_source):
        sid = created_source["id"]
        original_updated = created_source["updated_at"]
        resp = client.put(f"/api/v1/sources/{sid}", json={"name": "New"})
        assert resp.json()["updated_at"] != original_updated


class TestDeleteSource:
    def test_success(self, client, created_source):
        sid = created_source["id"]
        resp = client.delete(f"/api/v1/sources/{sid}")
        assert resp.status_code == 204

        # Verify gone
        resp = client.get(f"/api/v1/sources/{sid}")
        assert resp.status_code == 404

    def test_not_found(self, client):
        fake_id = str(uuid.uuid4())
        resp = client.delete(f"/api/v1/sources/{fake_id}")
        assert resp.status_code == 404
