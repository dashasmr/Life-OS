import asyncio
import json

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import StreamingResponse

from app.crud import create_event, list_events
from app.database import get_db
from app.schemas import EventCreate, EventRead
from app.services.realtime.broker import broker

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=EventRead, status_code=201)
def create_event_endpoint(payload: EventCreate, db: Session = Depends(get_db)):
    return create_event(db, payload)


@router.get("", response_model=list[EventRead])
def list_events_endpoint(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
    event_type: str | None = Query(None),
):
    return list_events(db, limit=limit, offset=offset, event_type=event_type)


@router.get("/stream")
async def sse_events_stream(request: Request):
    """
    Server-Sent Events: pushes JSON envelopes after DB mutations (`app_update`).
    Comment lines (: ping) keep intermediaries from closing idle streams.
    """

    async def event_generator():
        queue = await broker.subscribe()
        hello = json.dumps(
            {"type": "connected", "revision": broker.revision},
            separators=(",", ":"),
        )
        yield f"data: {hello}\n\n"
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=25.0)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            await broker.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
