"""Summary endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response

from app.models import Summary, SummaryGenerateRequest, SummaryListResponse
from app.services.storage import summaries_store
from app.services.summarizer import generate_summary

router = APIRouter(prefix="/summaries", tags=["Summaries"])


@router.get("", response_model=SummaryListResponse)
async def list_summaries(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    data = summaries_store.read()
    data.sort(key=lambda s: s.get("created_at", ""), reverse=True)
    total = len(data)
    items = data[offset : offset + limit]
    return SummaryListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{summary_id}", response_model=Summary)
async def get_summary(summary_id: UUID):
    data = summaries_store.read()
    for s in data:
        if s["id"] == str(summary_id):
            return s
    raise HTTPException(404, "Summary not found")


@router.post("/generate", response_model=Summary)
async def generate(body: SummaryGenerateRequest):
    try:
        summary = await generate_summary(
            source_ids=body.source_ids or None,
            since_days=body.since_days,
        )
        return summary
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(502, f"LLM provider error: {e}")


@router.delete("/{summary_id}", status_code=204)
async def delete_summary(summary_id: UUID):
    data = summaries_store.read()
    new_data = [s for s in data if s["id"] != str(summary_id)]
    if len(new_data) == len(data):
        raise HTTPException(404, "Summary not found")
    summaries_store.write(new_data)
    return Response(status_code=204)
