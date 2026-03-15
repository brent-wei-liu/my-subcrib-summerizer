"""Tests for JSON storage service."""

from app.config import DEFAULT_CONFIG
from app.services.storage import ConfigStore, JsonStore


class TestJsonStore:
    def test_read_nonexistent_returns_empty(self, tmp_path):
        store = JsonStore(tmp_path / "nope.json")
        assert store.read() == []

    def test_read_empty_file_returns_empty(self, tmp_path):
        f = tmp_path / "empty.json"
        f.write_text("")
        store = JsonStore(f)
        assert store.read() == []

    def test_write_then_read(self, tmp_path):
        f = tmp_path / "data.json"
        store = JsonStore(f)
        data = [{"id": "1", "name": "test"}]
        store.write(data)
        assert store.read() == data

    def test_write_overwrites(self, tmp_path):
        f = tmp_path / "data.json"
        store = JsonStore(f)
        store.write([{"a": 1}])
        store.write([{"b": 2}])
        assert store.read() == [{"b": 2}]

    def test_unicode_content(self, tmp_path):
        f = tmp_path / "unicode.json"
        store = JsonStore(f)
        data = [{"title": "中文标题", "emoji": "🚀"}]
        store.write(data)
        assert store.read() == data


class TestConfigStore:
    def test_read_nonexistent_returns_defaults(self, tmp_path):
        store = ConfigStore(tmp_path / "nope.json")
        config = store.read()
        assert config["llm"]["provider"] == "claude"
        assert config["scheduler"]["interval_minutes"] == 360
        assert config["crawler"]["request_timeout_seconds"] == 30

    def test_read_merges_with_defaults(self, tmp_path):
        f = tmp_path / "config.json"
        f.write_text('{"llm": {"provider": "openai"}}')
        store = ConfigStore(f)
        config = store.read()
        assert config["llm"]["provider"] == "openai"
        # Other defaults still present
        assert config["llm"]["max_tokens"] == 2000
        assert config["scheduler"]["enabled"] is True

    def test_write_then_read(self, tmp_path):
        f = tmp_path / "config.json"
        store = ConfigStore(f)
        config = store.read()
        config["llm"]["provider"] = "openai"
        store.write(config)
        assert store.read()["llm"]["provider"] == "openai"
