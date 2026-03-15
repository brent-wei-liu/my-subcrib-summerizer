"""Tests for Pydantic models validation."""

import pytest
from pydantic import ValidationError

from app.models import (
    SourceCreate,
    SourceUpdate,
    SummaryGenerateRequest,
    SchedulerConfigUpdate,
    LlmSettingsUpdate,
)


class TestSourceCreate:
    def test_valid(self):
        s = SourceCreate(name="Test", url="https://example.com/rss")
        assert s.name == "Test"
        assert s.category == "general"
        assert s.enabled is True

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            SourceCreate(name="", url="https://example.com/rss")

    def test_long_name_rejected(self):
        with pytest.raises(ValidationError):
            SourceCreate(name="x" * 201, url="https://example.com/rss")

    def test_invalid_url_rejected(self):
        with pytest.raises(ValidationError):
            SourceCreate(name="Test", url="not-a-url")


class TestSourceUpdate:
    def test_all_optional(self):
        s = SourceUpdate()
        assert s.name is None
        assert s.url is None

    def test_partial(self):
        s = SourceUpdate(name="Updated")
        assert s.name == "Updated"
        assert s.enabled is None


class TestSummaryGenerateRequest:
    def test_defaults(self):
        r = SummaryGenerateRequest()
        assert r.source_ids == []
        assert r.since_days == 7

    def test_since_days_min(self):
        with pytest.raises(ValidationError):
            SummaryGenerateRequest(since_days=0)

    def test_since_days_max(self):
        with pytest.raises(ValidationError):
            SummaryGenerateRequest(since_days=91)


class TestSchedulerConfigUpdate:
    def test_interval_min(self):
        with pytest.raises(ValidationError):
            SchedulerConfigUpdate(interval_minutes=4)

    def test_interval_max(self):
        with pytest.raises(ValidationError):
            SchedulerConfigUpdate(interval_minutes=10081)

    def test_valid_interval(self):
        c = SchedulerConfigUpdate(interval_minutes=60)
        assert c.interval_minutes == 60

    def test_articles_bounds(self):
        with pytest.raises(ValidationError):
            SchedulerConfigUpdate(max_articles_per_summary=5)
        with pytest.raises(ValidationError):
            SchedulerConfigUpdate(max_articles_per_summary=501)


class TestLlmSettingsUpdate:
    def test_temperature_bounds(self):
        with pytest.raises(ValidationError):
            LlmSettingsUpdate(temperature=-0.1)
        with pytest.raises(ValidationError):
            LlmSettingsUpdate(temperature=1.1)

    def test_max_tokens_bounds(self):
        with pytest.raises(ValidationError):
            LlmSettingsUpdate(max_tokens=50)
        with pytest.raises(ValidationError):
            LlmSettingsUpdate(max_tokens=9000)
