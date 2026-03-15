"""RSS source CRUD endpoints."""

from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Response

from app.models import Source, SourceCreate, SourceUpdate
from app.services.storage import sources_store

router = APIRouter(prefix="/sources", tags=["Sources"])


@router.get("", response_model=list[Source])
async def list_sources():
    return sources_store.read()


@router.post("", response_model=Source, status_code=201)
async def create_source(body: SourceCreate):
    now = datetime.utcnow()
    source = Source(
        id=uuid4(),
        name=body.name,
        url=str(body.url),
        category=body.category,
        enabled=body.enabled,
        created_at=now,
        updated_at=now,
    )
    data = sources_store.read()
    data.append(source.model_dump(mode="json"))
    sources_store.write(data)
    return source


@router.get("/{source_id}", response_model=Source)
async def get_source(source_id: UUID):
    data = sources_store.read()
    for s in data:
        if s["id"] == str(source_id):
            return s
    raise HTTPException(404, "Source not found")


@router.put("/{source_id}", response_model=Source)
async def update_source(source_id: UUID, body: SourceUpdate):
    data = sources_store.read()
    for i, s in enumerate(data):
        if s["id"] == str(source_id):
            updates = body.model_dump(exclude_none=True)
            if "url" in updates:
                updates["url"] = str(updates["url"])
            s.update(updates)
            s["updated_at"] = datetime.utcnow().isoformat()
            data[i] = s
            sources_store.write(data)
            return s
    raise HTTPException(404, "Source not found")


@router.delete("/{source_id}", status_code=204)
async def delete_source(source_id: UUID):
    data = sources_store.read()
    new_data = [s for s in data if s["id"] != str(source_id)]
    if len(new_data) == len(data):
        raise HTTPException(404, "Source not found")
    sources_store.write(new_data)
    return Response(status_code=204)
