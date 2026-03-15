"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import articles, crawler, scheduler, settings, sources, summaries
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.storage import sources_store
from app.seed import DEFAULT_SOURCES


def _seed_sources():
    """Populate default RSS sources on first run."""
    if sources_store.read():
        return
    from datetime import datetime
    from uuid import uuid4
    now = datetime.utcnow()
    data = []
    for s in DEFAULT_SOURCES:
        data.append({
            "id": str(uuid4()),
            "name": s["name"],
            "url": s["url"],
            "category": s["category"],
            "description": s.get("description"),
            "enabled": True,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "last_fetched_at": None,
        })
    sources_store.write(data)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_sources()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="RSS Subscription Summarizer API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(sources.router, prefix=PREFIX)
app.include_router(articles.router, prefix=PREFIX)
app.include_router(summaries.router, prefix=PREFIX)
app.include_router(crawler.router, prefix=PREFIX)
app.include_router(scheduler.router, prefix=PREFIX)
app.include_router(settings.router, prefix=PREFIX)


@app.get("/health")
async def health():
    return {"status": "ok"}
