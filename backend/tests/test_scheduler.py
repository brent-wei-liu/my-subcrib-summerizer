"""Tests for scheduler API."""

from unittest.mock import patch, MagicMock


class TestSchedulerStatus:
    def test_returns_status(self, client):
        with patch("app.routers.scheduler.get_status", return_value={
            "enabled": True,
            "interval_minutes": 360,
            "max_articles_per_summary": 100,
            "running": True,
            "next_run_at": "2026-03-15T18:00:00",
            "last_run_at": None,
        }):
            resp = client.get("/api/v1/scheduler/status")

        assert resp.status_code == 200
        body = resp.json()
        assert body["enabled"] is True
        assert body["interval_minutes"] == 360
        assert body["running"] is True


class TestSchedulerConfig:
    def test_update_interval(self, client):
        with patch("app.routers.scheduler.update_scheduler") as mock_update, \
             patch("app.routers.scheduler.get_status", return_value={
                 "enabled": True,
                 "interval_minutes": 60,
                 "max_articles_per_summary": 100,
                 "running": True,
                 "next_run_at": "2026-03-15T16:00:00",
                 "last_run_at": None,
             }):
            resp = client.put("/api/v1/scheduler/config", json={
                "interval_minutes": 60,
            })

        assert resp.status_code == 200
        assert resp.json()["interval_minutes"] == 60
        mock_update.assert_called_once_with(enabled=None, interval_minutes=60)

    def test_disable_scheduler(self, client):
        with patch("app.routers.scheduler.update_scheduler"), \
             patch("app.routers.scheduler.get_status", return_value={
                 "enabled": False,
                 "interval_minutes": 360,
                 "max_articles_per_summary": 100,
                 "running": False,
                 "next_run_at": None,
                 "last_run_at": None,
             }):
            resp = client.put("/api/v1/scheduler/config", json={"enabled": False})

        assert resp.status_code == 200
        assert resp.json()["enabled"] is False
        assert resp.json()["running"] is False

    def test_validation_min_interval(self, client):
        resp = client.put("/api/v1/scheduler/config", json={"interval_minutes": 1})
        assert resp.status_code == 422

    def test_validation_max_interval(self, client):
        resp = client.put("/api/v1/scheduler/config", json={"interval_minutes": 99999})
        assert resp.status_code == 422
