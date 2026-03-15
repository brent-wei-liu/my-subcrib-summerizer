"""Prompt construction and summary generation."""

from datetime import datetime, timedelta
from uuid import UUID, uuid4

from app.models import Article, Source, Summary
from app.services.llm import call_llm
from app.services.storage import articles_store, config_store, sources_store, summaries_store


SYSTEM_PROMPT_CROSS_SOURCE = (
    "你是一个专业的 RSS 订阅分析助手。你的任务是分析来自多位科技/AI 领域意见领袖的近期动态。\n\n"
    "请**全部使用中文**回复，按以下结构输出 Markdown 格式的分析报告：\n\n"
    "## 📌 本期要点\n"
    "用 3-5 句话概括最值得关注的趋势和事件。\n\n"
    "## 🔥 热门话题\n"
    "找出被多位大佬同时提及或关注的话题，说明各自的立场和观点异同。\n\n"
    "## 📊 分主题摘要\n"
    "按主题（如 AI模型、芯片/硬件、创业、开源、政策监管等）分组总结，每个主题下列出相关的人物和核心观点。\n\n"
    "## 🌱 新兴趋势\n"
    "识别刚刚浮现、尚未成为主流但值得关注的新方向或信号。\n\n"
    "要求：\n"
    "- 重点关注「大佬们最近在关注什么」\n"
    "- 引用具体文章标题和作者来支撑你的分析\n"
    "- 语言风格：专业但易读，适合技术从业者快速浏览\n"
    "- 全部使用中文输出"
)

SYSTEM_PROMPT_SINGLE_SOURCE = (
    "你是一个专业的 RSS 订阅分析助手。你的任务是分析来自 **{source_name}** 的近期动态。\n\n"
    "请**全部使用中文**回复，按以下结构输出 Markdown 格式的分析报告：\n\n"
    "## 📌 近期关注重点\n"
    "用 2-3 句话概括这位作者/博主近期最关注的方向。\n\n"
    "## 📊 主题摘要\n"
    "按主题分组总结该作者近期发表的内容，提炼核心观点。\n\n"
    "## 💡 关键观点\n"
    "列出最有价值或最有争议的独到见解。\n\n"
    "## 🔮 趋势信号\n"
    "从这些内容中识别出该作者可能在关注的新方向。\n\n"
    "要求：\n"
    "- 引用具体文章标题来支撑分析\n"
    "- 语言风格：专业但易读\n"
    "- 全部使用中文输出"
)


def _estimate_tokens(text: str) -> int:
    return len(text) // 4


async def generate_summary(source_ids: list[UUID] | None, since_days: int = 7) -> Summary:
    """Generate a summary from articles."""
    config = config_store.read()
    llm_config = config.get("llm", {})
    scheduler_config = config.get("scheduler", {})
    max_articles = scheduler_config.get("max_articles_per_summary", 100)

    now = datetime.utcnow()
    since = now - timedelta(days=since_days)

    # Load sources and articles
    raw_sources = sources_store.read()
    all_sources = {str(Source(**s).id): Source(**s) for s in raw_sources}

    raw_articles = articles_store.read()
    all_articles = [Article(**a) for a in raw_articles]

    # Filter articles
    if source_ids:
        sid_strs = {str(sid) for sid in source_ids}
        articles = [a for a in all_articles if str(a.source_id) in sid_strs]
    else:
        enabled_ids = {str(s.id) for s in all_sources.values() if s.enabled}
        articles = [a for a in all_articles if str(a.source_id) in enabled_ids]

    # Filter by time
    articles = [a for a in articles if (a.published_at or a.fetched_at) >= since]

    # Sort by published_at descending, limit
    articles.sort(key=lambda a: a.published_at or a.fetched_at, reverse=True)
    articles = articles[:max_articles]

    if not articles:
        raise ValueError("No articles found for the given criteria")

    # Determine source IDs actually used
    used_source_ids = list({a.source_id for a in articles})

    # Build prompt
    is_single = source_ids and len(source_ids) == 1
    if is_single:
        source = all_sources.get(str(source_ids[0]))
        source_name = source.name if source else "Unknown"
        system_prompt = SYSTEM_PROMPT_SINGLE_SOURCE.format(source_name=source_name)
    else:
        system_prompt = SYSTEM_PROMPT_CROSS_SOURCE

    # Group articles by source
    by_source: dict[str, list[Article]] = {}
    for a in articles:
        key = str(a.source_id)
        by_source.setdefault(key, []).append(a)

    user_parts = []
    for sid, group in by_source.items():
        source = all_sources.get(sid)
        name = source.name if source else "Unknown Source"
        user_parts.append(f"## Source: {name}\n")
        for a in group:
            date_str = (a.published_at or a.fetched_at).strftime("%Y-%m-%d")
            user_parts.append(f"### {a.title}")
            if a.author:
                user_parts.append(f"Author: {a.author}")
            user_parts.append(f"Date: {date_str}")
            if a.content_snippet:
                user_parts.append(f"{a.content_snippet}")
            user_parts.append("")

    user_prompt = "\n".join(user_parts)

    # Token budget check — truncate if too long
    estimated_tokens = _estimate_tokens(system_prompt + user_prompt)
    max_context = 180000  # conservative limit
    if estimated_tokens > max_context:
        allowed_chars = max_context * 4 - len(system_prompt)
        user_prompt = user_prompt[:allowed_chars]

    # Call LLM
    response = await call_llm(system_prompt, user_prompt)

    summary = Summary(
        id=uuid4(),
        created_at=now,
        period_start=since,
        period_end=now,
        source_ids=used_source_ids,
        article_count=len(articles),
        llm_provider=llm_config.get("provider", "claude"),
        llm_model=llm_config.get("model", "claude-sonnet-4-20250514"),
        content=response.content,
        prompt_tokens=response.prompt_tokens,
        completion_tokens=response.completion_tokens,
    )

    # Persist
    existing = summaries_store.read()
    existing.append(summary.model_dump(mode="json"))
    summaries_store.write(existing)

    return summary
