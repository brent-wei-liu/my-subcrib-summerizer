"""LLM abstraction layer for Claude and OpenAI."""

from dataclasses import dataclass

from app.config import get_api_key
from app.services.storage import config_store


@dataclass
class LlmResponse:
    content: str
    prompt_tokens: int
    completion_tokens: int


async def call_llm(system_prompt: str, user_prompt: str) -> LlmResponse:
    """Call the configured LLM provider."""
    config = config_store.read()
    llm_config = config.get("llm", {})
    provider = llm_config.get("provider", "claude")
    model = llm_config.get("model", "claude-sonnet-4-20250514")
    max_tokens = llm_config.get("max_tokens", 2000)
    temperature = llm_config.get("temperature", 0.3)
    api_key = get_api_key(provider, config)

    if not api_key:
        raise ValueError(f"No API key configured for provider '{provider}'. Set it via PUT /settings or environment variable.")

    if provider == "claude":
        return await _call_claude(api_key, model, max_tokens, temperature, system_prompt, user_prompt)
    elif provider == "openai":
        return await _call_openai(api_key, model, max_tokens, temperature, system_prompt, user_prompt)
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")


async def _call_claude(
    api_key: str, model: str, max_tokens: int, temperature: float,
    system_prompt: str, user_prompt: str,
) -> LlmResponse:
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=api_key)
    response = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return LlmResponse(
        content=response.content[0].text,
        prompt_tokens=response.usage.input_tokens,
        completion_tokens=response.usage.output_tokens,
    )


async def _call_openai(
    api_key: str, model: str, max_tokens: int, temperature: float,
    system_prompt: str, user_prompt: str,
) -> LlmResponse:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    response = await client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    choice = response.choices[0]
    return LlmResponse(
        content=choice.message.content or "",
        prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
        completion_tokens=response.usage.completion_tokens if response.usage else 0,
    )
