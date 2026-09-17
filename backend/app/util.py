# Helpers that transform Stash GraphQL payloads before they reach the browser.
# The most important job here is rewriting absolute Stash media URLs into
# same-origin /api/stash paths so the real Stash host and API key never leak.

from typing import Any
from urllib.parse import urlsplit

# Field names whose string values are Stash media URLs. Only these are rewritten,
# so external links such as scene.url or performer.twitter are left untouched.
MEDIA_KEYS = {
    "screenshot",
    "preview",
    "webp",
    "stream",
    "vtt",
    "sprite",
    "funscript",
    "interactive_heatmap",
    "caption",
    "image_path",
}


# Rewrites a single absolute Stash media URL to a relative /api/stash path.
# Keeps only the path and query and discards the origin, so whatever base Stash
# reports is irrelevant.
def to_proxy_url(value: str | None) -> str | None:
    if not value:
        return value
    parts = urlsplit(value)
    if not parts.scheme or not parts.netloc:
        # Already relative (or not a URL) - leave it as-is.
        return value
    suffix = f"?{parts.query}" if parts.query else ""
    return f"/api/stash{parts.path}{suffix}"


# Walks any nested GraphQL result and rewrites every media URL field in place.
# Recurses through dicts and lists so deeply nested studios, tags, performers and
# scene markers all get their images proxied in one pass.
def proxy_media_urls(node: Any) -> Any:
    if isinstance(node, dict):
        for key, value in node.items():
            if key in MEDIA_KEYS and isinstance(value, str):
                node[key] = to_proxy_url(value)
            else:
                proxy_media_urls(value)
    elif isinstance(node, list):
        for item in node:
            proxy_media_urls(item)
    return node
