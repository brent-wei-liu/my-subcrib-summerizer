"""APScheduler wrapper for automatic crawling."""

from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.services.storage import config_store

_scheduler: AsyncIOScheduler | None = None
_last_run_at: datetime | None = None


async def _crawl_job():
    """Job that runs on schedule to crawl all enabled sources."""
    global _last_run_at
    from app.services.crawler import crawl_all_enabled
    crawl_all_enabled()
    _last_run_at = datetime.utcnow()


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
    return _scheduler


def start_scheduler():
    """Start the scheduler based on config."""
    config = config_store.read()
    sched_config = config.get("scheduler", {})
    enabled = sched_config.get("enabled", True)
    interval = sched_config.get("interval_minutes", 360)

    scheduler = get_scheduler()

    # Remove existing job if any
    if scheduler.get_job("crawl_job"):
        scheduler.remove_job("crawl_job")

    if enabled:
        scheduler.add_job(
            _crawl_job,
            "interval",
            minutes=interval,
            id="crawl_job",
            replace_existing=True,
        )

    if not scheduler.running:
        scheduler.start()


def stop_scheduler():
    scheduler = get_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)


def update_scheduler(enabled: bool | None = None, interval_minutes: int | None = None):
    """Update scheduler config and reschedule."""
    config = config_store.read()
    sched_config = config.get("scheduler", {})

    if enabled is not None:
        sched_config["enabled"] = enabled
    if interval_minutes is not None:
        sched_config["interval_minutes"] = interval_minutes

    config["scheduler"] = sched_config
    config_store.write(config)

    scheduler = get_scheduler()

    # Remove existing job
    if scheduler.get_job("crawl_job"):
        scheduler.remove_job("crawl_job")

    if sched_config.get("enabled", True):
        scheduler.add_job(
            _crawl_job,
            "interval",
            minutes=sched_config.get("interval_minutes", 360),
            id="crawl_job",
            replace_existing=True,
        )
        if not scheduler.running:
            scheduler.start()


def get_status() -> dict:
    config = config_store.read()
    sched_config = config.get("scheduler", {})
    scheduler = get_scheduler()

    next_run = None
    job = scheduler.get_job("crawl_job")
    if job and job.next_run_time:
        next_run = job.next_run_time.isoformat()

    return {
        "enabled": sched_config.get("enabled", True),
        "interval_minutes": sched_config.get("interval_minutes", 360),
        "max_articles_per_summary": sched_config.get("max_articles_per_summary", 100),
        "running": scheduler.running,
        "next_run_at": next_run,
        "last_run_at": _last_run_at.isoformat() if _last_run_at else None,
    }
