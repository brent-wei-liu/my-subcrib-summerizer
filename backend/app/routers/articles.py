"""Article query endpoints (read-only)."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.models import Article, ArticleListResponse
from app.services.storage import articles_store

router = APIRouter(prefix="/articles", tags=["Articles"])


@router.get("", response_model=ArticleListResponse)
async def list_articles(
    source_id: Optional[UUID] = None,
    since: Optional[datetime] = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    data = articles_store.read()

    if source_id:
        data = [a for a in data if a.get("source_id") == str(source_id)]
    if since:
        data = [
            a for a in data
            if (a.get("published_at") or a.get("fetched_at", "")) >= since.isoformat()
        ]

    # Sort by published_at descending
    data.sort(key=lambda a: a.get("published_at") or a.get("fetched_at", ""), reverse=True)

    total = len(data)
    items = data[offset : offset + limit]

    return ArticleListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{article_id}", response_model=Article)
async def get_article(article_id: UUID):
    data = articles_store.read()
    for a in data:
        if a["id"] == str(article_id):
            return a
    raise HTTPException(404, "Article not found")
