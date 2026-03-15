"""JSON file storage with thread-safe read/write."""

import json
import threading
from pathlib import Path
from typing import Any

from app.config import CONFIG_FILE, DEFAULT_CONFIG


class JsonStore:
    """Thread-safe JSON file storage."""

    def __init__(self, file_path: Path):
        self._path = file_path
        self._lock = threading.Lock()

    def read(self) -> list[dict[str, Any]]:
        with self._lock:
            if not self._path.exists():
                return []
            text = self._path.read_text(encoding="utf-8")
            if not text.strip():
                return []
            return json.loads(text)

    def write(self, data: list[dict[str, Any]]) -> None:
        with self._lock:
            self._path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2, default=str),
                encoding="utf-8",
            )


class ConfigStore:
    """Thread-safe config JSON storage."""

    def __init__(self, file_path: Path = CONFIG_FILE):
        self._path = file_path
        self._lock = threading.Lock()

    def read(self) -> dict[str, Any]:
        with self._lock:
            if not self._path.exists():
                return json.loads(json.dumps(DEFAULT_CONFIG))
            text = self._path.read_text(encoding="utf-8")
            if not text.strip():
                return json.loads(json.dumps(DEFAULT_CONFIG))
            config = json.loads(text)
            # Merge with defaults for missing keys
            merged = json.loads(json.dumps(DEFAULT_CONFIG))
            for section in merged:
                if section in config:
                    merged[section].update(config[section])
            return merged

    def write(self, data: dict[str, Any]) -> None:
        with self._lock:
            self._path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2, default=str),
                encoding="utf-8",
            )


# Singleton instances
from app.config import SOURCES_FILE, ARTICLES_FILE, SUMMARIES_FILE

sources_store = JsonStore(SOURCES_FILE)
articles_store = JsonStore(ARTICLES_FILE)
summaries_store = JsonStore(SUMMARIES_FILE)
config_store = ConfigStore()
