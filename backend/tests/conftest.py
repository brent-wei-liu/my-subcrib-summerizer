"""Shared test fixtures."""

import json
import shutil
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def isolated_data_dir(tmp_path):
    """Redirect all storage to a temp directory for test isolation."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()

    patches = {
        "app.config.DATA_DIR": data_dir,
        "app.config.SOURCES_FILE": data_dir / "sources.json",
        "app.config.ARTICLES_FILE": data_dir / "articles.json",
        "app.config.SUMMARIES_FILE": data_dir / "summaries.json",
        "app.config.CONFIG_FILE": data_dir / "config.json",
    }

    with patch.multiple("app.config", **{k.split(".")[-1]: v for k, v in patches.items()}):
        # Re-initialize storage singletons with new paths
        from app.services import storage
        storage.sources_store = storage.JsonStore(data_dir / "sources.json")
        storage.articles_store = storage.JsonStore(data_dir / "articles.json")
        storage.summaries_store = storage.JsonStore(data_dir / "summaries.json")
        storage.config_store = storage.ConfigStore(data_dir / "config.json")

        # Also patch the module-level references used by other services
        with patch("app.services.crawler.sources_store", storage.sources_store), \
             patch("app.services.crawler.articles_store", storage.articles_store), \
             patch("app.services.crawler.config_store", storage.config_store), \
             patch("app.routers.sources.sources_store", storage.sources_store), \
             patch("app.routers.articles.articles_store", storage.articles_store), \
             patch("app.routers.summaries.summaries_store", storage.summaries_store), \
             patch("app.routers.settings.config_store", storage.config_store), \
             patch("app.services.summarizer.sources_store", storage.sources_store), \
             patch("app.services.summarizer.articles_store", storage.articles_store), \
             patch("app.services.summarizer.summaries_store", storage.summaries_store), \
             patch("app.services.summarizer.config_store", storage.config_store), \
             patch("app.services.llm.config_store", storage.config_store):
            yield data_dir


@pytest.fixture
def client(isolated_data_dir):
    """FastAPI test client with scheduler disabled."""
    with patch("app.main.start_scheduler"), patch("app.main.stop_scheduler"):
        from app.main import app
        with TestClient(app) as c:
            yield c


@pytest.fixture
def sample_source():
    return {
        "name": "Test Feed",
        "url": "https://example.com/rss",
        "category": "tech",
        "enabled": True,
    }


@pytest.fixture
def created_source(client, sample_source):
    """Create and return a source via the API."""
    resp = client.post("/api/v1/sources", json=sample_source)
    assert resp.status_code == 201
    return resp.json()
