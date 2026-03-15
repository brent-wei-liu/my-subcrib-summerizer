"""Configuration loading and defaults."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

SOURCES_FILE = DATA_DIR / "sources.json"
ARTICLES_FILE = DATA_DIR / "articles.json"
SUMMARIES_FILE = DATA_DIR / "summaries.json"
CONFIG_FILE = DATA_DIR / "config.json"

DEFAULT_CONFIG = {
    "llm": {
        "provider": "openai",
        "model": "gpt-4o",
        "claude_api_key": "",
        "openai_api_key": "",
        "max_tokens": 2000,
        "temperature": 0.3,
    },
    "scheduler": {
        "enabled": True,
        "interval_minutes": 360,
        "max_articles_per_summary": 100,
    },
    "crawler": {
        "request_timeout_seconds": 30,
        "max_content_snippet_length": 500,
    },
}


def get_api_key(provider: str, config: dict) -> str:
    """Get API key from env var first, then config."""
    if provider == "claude":
        return os.environ.get("CLAUDE_API_KEY", "") or config.get("llm", {}).get("claude_api_key", "")
    elif provider == "openai":
        return os.environ.get("OPENAI_API_KEY", "") or config.get("llm", {}).get("openai_api_key", "")
    return ""
