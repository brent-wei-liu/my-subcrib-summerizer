"""Tests for LLM service."""

import pytest
from unittest.mock import patch, AsyncMock
from types import SimpleNamespace

from app.services.llm import call_llm, LlmResponse


@pytest.mark.asyncio
async def test_no_api_key_raises(isolated_data_dir):
    with pytest.raises(ValueError, match="No API key configured"):
        await call_llm("system", "user")


@pytest.mark.asyncio
async def test_unknown_provider_raises(isolated_data_dir):
    from app.services.llm import config_store
    config = config_store.read()
    config["llm"]["provider"] = "unknown"
    config_store.write(config)

    with pytest.raises(ValueError):
        await call_llm("system", "user")


@pytest.mark.asyncio
async def test_call_claude(isolated_data_dir):
    from app.services.llm import config_store
    config = config_store.read()
    config["llm"]["claude_api_key"] = "test-key"
    config_store.write(config)

    mock_response = SimpleNamespace(
        content=[SimpleNamespace(text="Summary result")],
        usage=SimpleNamespace(input_tokens=100, output_tokens=50),
    )
    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    with patch("anthropic.AsyncAnthropic", return_value=mock_client):
        result = await call_llm("system prompt", "user prompt")

    assert result.content == "Summary result"
    assert result.prompt_tokens == 100
    assert result.completion_tokens == 50
    mock_client.messages.create.assert_called_once()


@pytest.mark.asyncio
async def test_call_openai(isolated_data_dir):
    from app.services.llm import config_store
    config = config_store.read()
    config["llm"]["provider"] = "openai"
    config["llm"]["model"] = "gpt-4o"
    config["llm"]["openai_api_key"] = "test-key"
    config_store.write(config)

    mock_response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="OpenAI result"))],
        usage=SimpleNamespace(prompt_tokens=80, completion_tokens=40),
    )
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

    with patch("openai.AsyncOpenAI", return_value=mock_client):
        result = await call_llm("system", "user")

    assert result.content == "OpenAI result"
    assert result.prompt_tokens == 80
    assert result.completion_tokens == 40
