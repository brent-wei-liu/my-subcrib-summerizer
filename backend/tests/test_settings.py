"""Tests for settings API."""


class TestGetSettings:
    def test_defaults(self, client):
        resp = client.get("/api/v1/settings")
        assert resp.status_code == 200
        body = resp.json()
        assert body["llm"]["provider"] == "claude"
        assert body["llm"]["model"] == "claude-sonnet-4-20250514"
        assert body["llm"]["claude_api_key_set"] is False
        assert body["llm"]["openai_api_key_set"] is False
        assert body["llm"]["max_tokens"] == 2000
        assert body["llm"]["temperature"] == 0.3
        assert body["crawler"]["request_timeout_seconds"] == 30
        assert body["crawler"]["max_content_snippet_length"] == 500

    def test_api_key_never_returned(self, client):
        # Set an API key
        client.put("/api/v1/settings", json={
            "llm": {"claude_api_key": "sk-test-key-12345"}
        })
        resp = client.get("/api/v1/settings")
        body = resp.json()
        assert "claude_api_key" not in body["llm"]
        assert body["llm"]["claude_api_key_set"] is True


class TestUpdateSettings:
    def test_update_provider(self, client):
        resp = client.put("/api/v1/settings", json={
            "llm": {"provider": "openai", "model": "gpt-4o"}
        })
        assert resp.status_code == 200
        body = resp.json()
        assert body["llm"]["provider"] == "openai"
        assert body["llm"]["model"] == "gpt-4o"

    def test_update_crawler_settings(self, client):
        resp = client.put("/api/v1/settings", json={
            "crawler": {"request_timeout_seconds": 60, "max_content_snippet_length": 1000}
        })
        assert resp.status_code == 200
        assert resp.json()["crawler"]["request_timeout_seconds"] == 60
        assert resp.json()["crawler"]["max_content_snippet_length"] == 1000

    def test_partial_update_preserves_other_fields(self, client):
        client.put("/api/v1/settings", json={
            "llm": {"max_tokens": 4000}
        })
        resp = client.get("/api/v1/settings")
        body = resp.json()
        assert body["llm"]["max_tokens"] == 4000
        assert body["llm"]["provider"] == "claude"  # unchanged

    def test_set_api_key_marks_as_set(self, client):
        resp = client.put("/api/v1/settings", json={
            "llm": {"openai_api_key": "sk-test"}
        })
        assert resp.status_code == 200
        assert resp.json()["llm"]["openai_api_key_set"] is True
