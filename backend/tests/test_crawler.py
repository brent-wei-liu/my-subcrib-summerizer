"""Tests for crawler service and API."""

import uuid
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

import feedparser

from app.models import Source, CrawlResult
from app.services.crawler import _strip_html, _parse_published, crawl_source


def _make_entry(**kwargs):
    """Create a feedparser-like entry (FeedParserDict supports .get())."""
    entry = feedparser.FeedParserDict(kwargs)
    return entry


class TestStripHtml:
    def test_removes_tags(self):
        assert _strip_html("<p>Hello <b>world</b></p>") == "Hello world"

    def test_decodes_entities(self):
        assert _strip_html("&amp; &lt; &gt;") == "& < >"

    def test_empty_string(self):
        assert _strip_html("") == ""

    def test_none_like(self):
        assert _strip_html("") == ""

    def test_plain_text(self):
        assert _strip_html("no tags here") == "no tags here"


class TestParsePublished:
    def test_with_published_parsed(self):
        from time import strptime
        entry = SimpleNamespace(
            published_parsed=strptime("2026-03-15", "%Y-%m-%d"),
            updated_parsed=None,
        )
        result = _parse_published(entry)
        assert result is not None
        assert result.year == 2026
        assert result.month == 3
        assert result.day == 15

    def test_fallback_to_updated(self):
        from time import strptime
        entry = SimpleNamespace(
            published_parsed=None,
            updated_parsed=strptime("2026-01-01", "%Y-%m-%d"),
        )
        result = _parse_published(entry)
        assert result is not None
        assert result.year == 2026

    def test_no_date(self):
        entry = SimpleNamespace(published_parsed=None, updated_parsed=None)
        assert _parse_published(entry) is None


class TestCrawlSource:
    def test_parses_feed_entries(self, isolated_data_dir):
        source = Source(
            id=uuid.uuid4(),
            name="Test",
            url="https://example.com/rss",
            category="test",
        )

        mock_feed = SimpleNamespace(
            bozo=False,
            entries=[
                _make_entry(
                    id="guid-1",
                    title="Article 1",
                    link="https://example.com/1",
                    author="Author 1",
                    published_parsed=None,
                    updated_parsed=None,
                    summary="<p>Summary text</p>",
                ),
                _make_entry(
                    id="guid-2",
                    title="Article 2",
                    link="https://example.com/2",
                    author=None,
                    published_parsed=None,
                    updated_parsed=None,
                    summary="Plain summary",
                ),
            ],
        )

        with patch("app.services.crawler.feedparser.parse", return_value=mock_feed):
            articles, error = crawl_source(source, max_snippet_length=500, timeout=30)

        assert error is None
        assert len(articles) == 2
        assert articles[0].title == "Article 1"
        assert articles[0].content_snippet == "Summary text"  # HTML stripped
        assert articles[1].title == "Article 2"

    def test_deduplicates_by_guid(self, isolated_data_dir):
        source_id = uuid.uuid4()
        source = Source(id=source_id, name="Test", url="https://example.com/rss", category="test")

        # Pre-populate an existing article
        from app.services.crawler import articles_store
        articles_store.write([{
            "id": str(uuid.uuid4()),
            "source_id": str(source_id),
            "title": "Existing",
            "url": "https://example.com/1",
            "fetched_at": "2026-03-15T12:00:00",
            "guid": "existing-guid",
        }])

        mock_feed = SimpleNamespace(
            bozo=False,
            entries=[
                _make_entry(id="existing-guid", title="Dup", link="https://example.com/1",
                            published_parsed=None, updated_parsed=None, summary="dup"),
                _make_entry(id="new-guid", title="New", link="https://example.com/2",
                            published_parsed=None, updated_parsed=None, summary="new"),
            ],
        )

        with patch("app.services.crawler.feedparser.parse", return_value=mock_feed):
            articles, error = crawl_source(source, 500, 30)

        assert error is None
        assert len(articles) == 1
        assert articles[0].title == "New"

    def test_bozo_feed_with_no_entries(self, isolated_data_dir):
        source = Source(id=uuid.uuid4(), name="Bad", url="https://bad.com/rss", category="test")

        mock_feed = SimpleNamespace(bozo=True, bozo_exception=Exception("bad feed"), entries=[])
        with patch("app.services.crawler.feedparser.parse", return_value=mock_feed):
            articles, error = crawl_source(source, 500, 30)

        assert articles == []
        assert "bad feed" in error

    def test_snippet_truncation(self, isolated_data_dir):
        source = Source(id=uuid.uuid4(), name="Test", url="https://example.com/rss", category="test")
        long_text = "A" * 1000

        mock_feed = SimpleNamespace(
            bozo=False,
            entries=[_make_entry(
                id="g1", title="T", link="https://a.com",
                published_parsed=None, updated_parsed=None,
                summary=long_text,
            )],
        )

        with patch("app.services.crawler.feedparser.parse", return_value=mock_feed):
            articles, _ = crawl_source(source, max_snippet_length=100, timeout=30)

        assert len(articles[0].content_snippet) == 100


class TestCrawlTriggerAPI:
    def test_trigger_returns_result(self, client):
        mock_result = CrawlResult(total_new_articles=5, sources_crawled=1, errors=[])
        with patch("app.routers.crawler.crawl_all_enabled", return_value=mock_result):
            resp = client.post("/api/v1/crawler/trigger")

        assert resp.status_code == 200
        body = resp.json()
        assert body["total_new_articles"] == 5
        assert body["sources_crawled"] == 1
        assert body["errors"] == []
