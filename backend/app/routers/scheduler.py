"""Scheduler status and config endpoints."""

from fastapi import APIRouter

from app.models import SchedulerConfigUpdate, SchedulerStatus
from app.services.scheduler import get_status, update_scheduler

router = APIRouter(prefix="/scheduler", tags=["Scheduler"])


@router.get("/status", response_model=SchedulerStatus)
async def scheduler_status():
    return get_status()


@router.put("/config", response_model=SchedulerStatus)
async def update_config(body: SchedulerConfigUpdate):
    update_scheduler(
        enabled=body.enabled,
        interval_minutes=body.interval_minutes,
    )
    # Also update max_articles_per_summary if provided
    if body.max_articles_per_summary is not None:
        from app.services.storage import config_store
        config = config_store.read()
        config.setdefault("scheduler", {})["max_articles_per_summary"] = body.max_articles_per_summary
        config_store.write(config)
    return get_status()
