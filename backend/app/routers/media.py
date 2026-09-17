# The media proxy: streams images, video and VTT thumbnail tracks from Stash to
# the browser. Byte-range requests are forwarded so video seeking works, and the
# upstream body is streamed chunk-by-chunk so a single worker can serve many
# concurrent video streams with near-constant memory.

from typing import Annotated

from fastapi import APIRouter, Request, Response
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask

from ..config import get_settings
from ..media import (
    build_upstream_headers,
    collect_response_headers,
    is_vtt_response,
    rewrite_vtt_urls,
)

router = APIRouter(tags=["media"])

# Long-lived cache for hover previews, sprites, images and thumbnails. Stash sends
# `Cache-Control: no-cache` on preview clips, which forces the browser to re-download
# the whole 1 MB file on every hover; since these assets are content-derived and
# effectively immutable, we override that so repeat hovers are served from cache.
_MEDIA_CACHE_CONTROL = "public, max-age=2592000, immutable"


# Applies aggressive caching to everything except the primary video stream, whose
# large full-length body should not be pinned in the browser cache as immutable.
def _apply_cache_control(headers: dict[str, str], path: str) -> None:
    if path.endswith("/stream"):
        return
    headers["Cache-Control"] = _MEDIA_CACHE_CONTROL


# Catch-all proxy for any Stash media path (e.g. scene/{id}/stream, performer
# images, sprite VTT files). Everything after /api/stash/ is forwarded verbatim.
@router.get("/stash/{path:path}")
async def proxy_media(path: str, request: Request) -> Response:
    settings = get_settings()
    query = request.url.query
    target = f"{settings.stash_base}/{path}"
    if query:
        target = f"{target}?{query}"

    client = request.app.state.http
    upstream_headers = build_upstream_headers(request.headers.get("range"))

    # Open the upstream response in streaming mode; it stays open until the body
    # has been fully relayed (or rewritten, for VTT).
    upstream_request = client.build_request("GET", target, headers=upstream_headers)
    upstream = await client.send(upstream_request, stream=True)

    response_headers = collect_response_headers(upstream)
    _apply_cache_control(response_headers, path)
    content_type = upstream.headers.get("Content-Type", "")
    path_segments = path.split("/")

    # VTT thumbnail tracks are small and must be rewritten, so buffer them fully.
    if is_vtt_response(content_type, path_segments):
        raw = await upstream.aread()
        await upstream.aclose()
        vtt_dir = "/".join(path_segments[:-1])
        vtt_proxy_base = f"/api/stash/{vtt_dir}/"
        rewritten = rewrite_vtt_urls(raw.decode("utf-8", errors="replace"), vtt_proxy_base)
        response_headers.pop("Content-Length", None)
        return Response(
            content=rewritten,
            status_code=upstream.status_code,
            headers=response_headers,
            media_type=content_type or "text/vtt",
        )

    # Everything else (images, video) is streamed straight through. aiter_raw
    # preserves the exact bytes so forwarded Content-Length/Content-Range match.
    #
    # Closing the upstream response is critical: a browser hovering over a grid
    # opens dozens of preview streams and abandons them the instant the pointer
    # moves. Every abandoned stream must release its slot, otherwise (especially
    # over HTTP/2, where many streams share one connection) the pool saturates and
    # every later request hangs. We close in the generator's finally (covers normal
    # completion and client-disconnect cancellation) and also register a
    # BackgroundTask as a belt-and-suspenders guarantee; aclose is idempotent.
    async def body_stream():
        try:
            async for chunk in upstream.aiter_raw():
                yield chunk
        finally:
            await upstream.aclose()

    return StreamingResponse(
        body_stream(),
        status_code=upstream.status_code,
        headers=response_headers,
        background=BackgroundTask(upstream.aclose),
    )
