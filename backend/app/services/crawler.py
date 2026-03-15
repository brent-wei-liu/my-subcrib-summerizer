"""RSS crawling and parsing service."""

import html
import re
from datetime import datetime
from time import mktime
from uuid import uuid4

import feedparser

from app.models import Article, CrawlError, CrawlResult, Source
from app.services.storage import articles_store, config_store, sources_store


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode entities."""
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", "", text)
    return html.unescape(text).strip()


def _parse_published(entry) -> datetime | None:
    for attr in ("published_parsed", "updated_parsed"):
        parsed = getattr(entry, attr, None)
        if parsed:
            try:
                return datetime.utcfromtimestamp(mktime(parsed))
            except (ValueError, OverflowError):
                pass
    return None


def crawl_source(source: Source, max_snippet_length: int, timeout: int) -> tuple[list[Article], str | None]:
    """Crawl a single RSS source. Returns (new_articles, error_message)."""
    try:
        feed = feedparser.parse(source.url, request_headers={"User-Agent": "RSS-Summarizer/1.0"})
        if feed.bozo and not feed.entries:
            return [], f"Feed parse error: {feed.bozo_exception}"
    except Exception as e:
        return [], str(e)

    existing = articles_store.read()
    existing_guids = {a["guid"] for a in existing if a.get("source_id") == str(source.id)}

    new_articles: list[Article] = []
    for entry in feed.entries:
        guid = entry.get("id") or entry.get("link") or entry.get("title", "")
        if not guid or guid in existing_guids:
            continue

        content_text = ""
        if hasattr(entry, "content") and entry.content:
            content_text = entry.content[0].get("value", "")
        elif hasattr(entry, "summary"):
            content_text = entry.summary or ""
        elif hasattr(entry, "description"):
            content_text = entry.description or ""

        snippet = _strip_html(content_text)[:max_snippet_length]

        article = Article(
            id=uuid4(),
            source_id=source.id,
            title=entry.get("title", "Untitled"),
            url=entry.get("link", ""),
            author=entry.get("author"),
            published_at=_parse_published(entry),
            fetched_at=datetime.utcnow(),
            content_snippet=snippet,
            guid=guid,
        )
        new_articles.append(article)
        existing_guids.add(guid)

    return new_articles, None


def crawl_all_enabled() -> CrawlResult:
    """Crawl all enabled sources."""
    config = config_store.read()
    crawler_config = config.get("crawler", {})
    max_snippet = crawler_config.get("max_content_snippet_length", 500)
    timeout = crawler_config.get("request_timeout_seconds", 30)

    raw_sources = sources_store.read()
    sources = [Source(**s) for s in raw_sources]
    enabled = [s for s in sources if s.enabled]

    all_new: list[Article] = []
    errors: list[CrawlError] = []
    sources_crawled = 0

    for source in enabled:
        new_articles, error = crawl_source(source, max_snippet, timeout)
        if error:
            errors.append(CrawlError(source_id=source.id, source_name=source.name, error=error))
        else:
            sources_crawled += 1

        if new_articles:
            all_new.extend(new_articles)

        # Update last_fetched_at
        source.last_fetched_at = datetime.utcnow()

    # Persist new articles
    if all_new:
        existing = articles_store.read()
        existing.extend([a.model_dump(mode="json") for a in all_new])
        articles_store.write(existing)

    # Persist updated sources (last_fetched_at)
    sources_store.write([s.model_dump(mode="json") for s in sources])

    return CrawlResult(
        total_new_articles=len(all_new),
        sources_crawled=sources_crawled,
        errors=errors,
    )
