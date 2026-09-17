# Application entry point: builds the FastAPI app, owns the shared httpx client,
# and mounts every REST router under /api. The single pooled AsyncClient created
# in the lifespan is reused for both GraphQL calls and media streaming, which is
# what lets one worker handle many concurrent video streams efficiently.

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI

from . import favicon
from .config import get_settings
from .routers import media, meta, performers, scenes, search, stats, studios, tags


# Creates the pooled httpx client on startup and disposes it on shutdown.
# The client speaks HTTP/1.1 on purpose: this proxy holds media responses open
# for the life of a stream, and HTTP/1.1 gives each held stream its own pooled
# connection, so parked streams can never block unrelated API calls.
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    # Render every favicon variant to disk once at boot so requests only read a
    # file. Stored on app.state for the meta router to locate.
    app.state.favicon_dir = favicon.generate_all(settings.favicon_path)

    limits = httpx.Limits(
        max_connections=settings.http_max_connections,
        max_keepalive_connections=settings.http_max_keepalive,
    )
    # Every phase is bounded so a single misbehaving upstream can never wedge the
    # worker. read=60 caps the gap *between* bytes, not the total stream length,
    # so hour-long videos keep flowing (chunks arrive far more often than 60s)
    # while a genuinely stalled upstream is dropped and its connection reclaimed.
    # A paused player simply stops pulling, so no read is in flight to time out.
    timeout = httpx.Timeout(connect=10.0, read=60.0, write=30.0, pool=10.0)
    # HTTP/1.1 (not http2) is deliberate. Under http2 httpx funnels every request
    # onto one connection capped at N concurrent streams; a few parked media
    # streams exhaust that cap and then *all* new requests -- even plain GraphQL
    # GETs -- block on the stream limit (which pool timeout does not cover),
    # starving the whole app. HTTP/1.1 gives each in-flight stream its own pooled
    # connection instead, so media load can never freeze the data endpoints.
    async with httpx.AsyncClient(
        limits=limits, timeout=timeout, follow_redirects=True
    ) as client:
        app.state.http = client
        yield


def create_app() -> FastAPI:
    app = FastAPI(title="StashHub API", lifespan=lifespan)

    # Order matters: the media catch-all is broad, so specific data routers are
    # registered first. All share the /api prefix that nginx proxies to.
    app.include_router(scenes.router, prefix="/api")
    app.include_router(performers.router, prefix="/api")
    app.include_router(studios.router, prefix="/api")
    app.include_router(tags.router, prefix="/api")
    app.include_router(search.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(meta.router, prefix="/api")
    app.include_router(media.router, prefix="/api")

    return app


app = create_app()
