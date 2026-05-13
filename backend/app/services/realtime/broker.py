"""
In-process SSE fan-out for a single uvicorn worker. Use one worker in dev; multi-worker prod needs Redis Pub/Sub.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any


class RealtimeBroker:
    """Thread-safe publish from sync CRUD into asyncio SSE subscribers."""

    def __init__(self) -> None:
        self._main_loop: asyncio.AbstractEventLoop | None = None
        self._subscribers: set[asyncio.Queue[str]] = set()
        self._lock = asyncio.Lock()
        self._revision = 0

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._main_loop = loop

    @property
    def revision(self) -> int:
        return self._revision

    async def subscribe(self) -> asyncio.Queue[str]:
        q: asyncio.Queue[str] = asyncio.Queue(maxsize=256)
        async with self._lock:
            self._subscribers.add(q)
        return q

    async def unsubscribe(self, q: asyncio.Queue[str]) -> None:
        async with self._lock:
            self._subscribers.discard(q)

    def publish_sync(self, payload: dict[str, Any]) -> None:
        loop = self._main_loop
        if loop is None:
            return
        self._revision += 1
        body = dict(payload)
        body.setdefault("revision", self._revision)
        msg = json.dumps(body, separators=(",", ":"))
        try:
            asyncio.run_coroutine_threadsafe(self._broadcast(msg), loop)
        except RuntimeError:
            return

    async def _broadcast(self, message: str) -> None:
        async with self._lock:
            targets = list(self._subscribers)
        for q in targets:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                try:
                    _ = q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    q.put_nowait(message)
                except asyncio.QueueFull:
                    pass


broker = RealtimeBroker()


def publish_app_update(reason: str, **extra: Any) -> None:
    """Called from sync code paths after a successful DB commit."""
    broker.publish_sync({"type": "app_update", "reason": reason, **extra})
