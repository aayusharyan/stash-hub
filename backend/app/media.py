# Helpers for the media proxy that streams images and video from Stash.
# The tricky part is WebVTT thumbnail files: the sprite image URLs inside them
# must be rewritten so the browser fetches them back through this proxy instead
# of hitting the Stash origin directly (which would fail without the API key).

import re

import httpx

from .config import get_settings

# Response/content-type header the proxy copies straight from Stash to the client.
FORWARD_HEADERS = (
    "Content-Type",
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
    "Cache-Control",
)

# Matches a VTT line that is a relative sprite filename (no scheme, no leading
# slash) ending in an image extension, so only those lines get a proxy prefix.
_RELATIVE_IMAGE_RE = re.compile(
    r"^((?!https?:|/)[^\n]*\.(?:jpg|jpeg|png|webp|gif)[^\n]*)$",
    re.IGNORECASE | re.MULTILINE,
)


# Detects whether an upstream response is a WebVTT thumbnail track, either by its
# content-type or by the request path ending in .vtt (Stash is inconsistent here).
def is_vtt_response(content_type: str, path_segments: list[str]) -> bool:
    if "text/vtt" in content_type:
        return True
    last = path_segments[-1] if path_segments else ""
    return last == "vtt" or last.endswith(".vtt")


# Rewrites sprite image URLs inside a VTT body so all thumbnails load via the proxy.
# Absolute Stash-origin URLs get their origin swapped for /api/stash; relative
# filenames are prefixed with the VTT's own proxy directory so they resolve
# against the VTT file rather than the current page URL.
def rewrite_vtt_urls(vtt_text: str, vtt_proxy_base: str) -> str:
    origin = get_settings().stash_base
    result = vtt_text.replace(origin, "/api/stash")
    return _RELATIVE_IMAGE_RE.sub(lambda m: vtt_proxy_base + m.group(1), result)


# Assembles the outgoing request headers for Stash, injecting the API key and
# forwarding the client's Range header so byte-range video seeking works.
def build_upstream_headers(range_header: str | None) -> dict[str, str]:
    settings = get_settings()
    headers: dict[str, str] = {}
    if settings.stash_api_key:
        headers["ApiKey"] = settings.stash_api_key
    if range_header:
        headers["Range"] = range_header
    return headers


# Copies only the safe subset of headers from the Stash response to the client.
def collect_response_headers(upstream: httpx.Response) -> dict[str, str]:
    headers: dict[str, str] = {}
    for name in FORWARD_HEADERS:
        value = upstream.headers.get(name)
        if value:
            headers[name] = value
    return headers
