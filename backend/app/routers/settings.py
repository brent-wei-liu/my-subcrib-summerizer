"""Application settings endpoints."""

import os

from fastapi import APIRouter

from app.models import Settings, SettingsUpdate
from app.services.storage import config_store

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=Settings)
async def get_settings():
    config = config_store.read()
    llm = config.get("llm", {})
    crawler = config.get("crawler", {})

    claude_key = os.environ.get("CLAUDE_API_KEY", "") or llm.get("claude_api_key", "")
    openai_key = os.environ.get("OPENAI_API_KEY", "") or llm.get("openai_api_key", "")

    return Settings(
        llm={
            "provider": llm.get("provider", "claude"),
            "model": llm.get("model", "claude-sonnet-4-20250514"),
            "claude_api_key_set": bool(claude_key),
            "openai_api_key_set": bool(openai_key),
            "max_tokens": llm.get("max_tokens", 2000),
            "temperature": llm.get("temperature", 0.3),
        },
        crawler=crawler,
    )


@router.put("", response_model=Settings)
async def update_settings(body: SettingsUpdate):
    config = config_store.read()

    if body.llm:
        llm = config.get("llm", {})
        updates = body.llm.model_dump(exclude_none=True)
        llm.update(updates)
        config["llm"] = llm

    if body.crawler:
        config["crawler"] = body.crawler.model_dump()

    config_store.write(config)
    return await get_settings()
