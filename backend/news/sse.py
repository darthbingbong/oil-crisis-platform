"""
In-process pub/sub for Server-Sent Events. Single FastAPI process, no
Redis/message-broker needed at this scale -- each connected client gets
its own asyncio.Queue; broadcast() puts the payload on every queue.
GET /api/v1/news/stream (main.py) is the only consumer of subscribe().
"""

import asyncio
import logging

logger = logging.getLogger("news_pipeline")

_subscribers: set[asyncio.Queue] = set()


def subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _subscribers.add(q)
    logger.info("SSE client connected (%d total).", len(_subscribers))
    return q


def unsubscribe(q: asyncio.Queue) -> None:
    _subscribers.discard(q)
    logger.info("SSE client disconnected (%d total).", len(_subscribers))


def broadcast(event_type: str, data: dict) -> None:
    """Fire-and-forget to every connected client. A slow/stuck client's
    full queue is dropped-for rather than allowed to block delivery to
    everyone else."""
    dropped = 0
    for q in _subscribers:
        try:
            q.put_nowait({"type": event_type, "data": data})
        except asyncio.QueueFull:
            dropped += 1
    if dropped:
        logger.warning("SSE: %d subscriber(s) had a full queue, message dropped for them.", dropped)
    logger.info("SSE broadcast '%s' to %d subscriber(s).", event_type, len(_subscribers))
