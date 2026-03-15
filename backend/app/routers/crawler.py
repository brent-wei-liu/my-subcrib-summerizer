"""Crawler trigger endpoint."""

from fastapi import APIRouter

from app.models import CrawlResult
from app.services.crawler import crawl_all_enabled

router = APIRouter(prefix="/crawler", tags=["Crawler"])


@router.post("/trigger", response_model=CrawlResult)
async def trigger_crawl():
    result = crawl_all_enabled()
    return result
