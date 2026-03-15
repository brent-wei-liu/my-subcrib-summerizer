"""Pydantic models for request/response/storage schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, HttpUrl


# ─── Source ──────────────────────────────────────────────

class SourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    url: HttpUrl
    category: str = "general"
    description: Optional[str] = None
    enabled: bool = True


class SourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    url: Optional[HttpUrl] = None
    category: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None


class Source(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    url: str
    category: str = "general"
    description: Optional[str] = None
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_fetched_at: Optional[datetime] = None


# ─── Article ─────────────────────────────────────────────

class Article(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    source_id: UUID
    title: str
    url: str
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    content_snippet: Optional[str] = None
    guid: str


class ArticleListResponse(BaseModel):
    items: list[Article]
    total: int
    limit: int
    offset: int


# ─── Summary ────────────────────────────────────────────

class SummaryGenerateRequest(BaseModel):
    source_ids: list[UUID] = Field(default_factory=list)
    since_days: int = Field(default=7, ge=1, le=90)


class Summary(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    period_start: datetime
    period_end: datetime
    source_ids: list[UUID]
    article_count: int
    llm_provider: str
    llm_model: str
    content: str
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None


class SummaryListResponse(BaseModel):
    items: list[Summary]
    total: int
    limit: int
    offset: int


# ─── Crawler ────────────────────────────────────────────

class CrawlError(BaseModel):
    source_id: UUID
    source_name: str
    error: str


class CrawlResult(BaseModel):
    total_new_articles: int
    sources_crawled: int
    errors: list[CrawlError]


# ─── Scheduler ──────────────────────────────────────────

class SchedulerStatus(BaseModel):
    enabled: bool
    interval_minutes: int
    max_articles_per_summary: int
    running: bool
    next_run_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None


class SchedulerConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    interval_minutes: Optional[int] = Field(None, ge=5, le=10080)
    max_articles_per_summary: Optional[int] = Field(None, ge=10, le=500)


# ─── Settings ───────────────────────────────────────────

class LlmSettings(BaseModel):
    provider: str = "claude"
    model: str = "claude-sonnet-4-20250514"
    claude_api_key_set: bool = False
    openai_api_key_set: bool = False
    max_tokens: int = Field(default=2000, ge=100, le=8000)
    temperature: float = Field(default=0.3, ge=0, le=1)


class CrawlerSettings(BaseModel):
    request_timeout_seconds: int = Field(default=30, ge=5, le=120)
    max_content_snippet_length: int = Field(default=500, ge=100, le=2000)


class Settings(BaseModel):
    llm: LlmSettings = Field(default_factory=LlmSettings)
    crawler: CrawlerSettings = Field(default_factory=CrawlerSettings)


class LlmSettingsUpdate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    claude_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    max_tokens: Optional[int] = Field(None, ge=100, le=8000)
    temperature: Optional[float] = Field(None, ge=0, le=1)


class SettingsUpdate(BaseModel):
    llm: Optional[LlmSettingsUpdate] = None
    crawler: Optional[CrawlerSettings] = None


# ─── Error ──────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str
