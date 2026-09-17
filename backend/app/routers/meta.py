# Meta endpoints that are not Stash data: runtime config for the SPA and the
# themed favicon. Serving config from here removes the need to bake build-time env
# vars into the frontend bundle. Favicons are pre-rendered to disk at startup (see
# app/favicon.py) and served here as plain static files keyed by variant name.

from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from ..config import get_settings
from ..favicon import VALID_VARIANTS

router = APIRouter(tags=["meta"])


# Runtime configuration the browser needs. These are the only server values ever
# exposed to the client; the internal URL and API key are never included.
@router.get("/config")
async def get_config() -> dict[str, object]:
    settings = get_settings()
    return {"externalUrl": settings.stash_external_url, "pageSize": settings.page_size}


# Serves a pre-generated favicon by its variant filename (e.g. "orange-dark.png" or
# "orange-dark"). Unknown variants 404 rather than rendering anything on the fly.
@router.get("/favicon/{variant}")
async def favicon(variant: str, request: Request) -> FileResponse:
    stem = variant[:-4] if variant.endswith(".png") else variant
    if stem not in VALID_VARIANTS:
        raise HTTPException(status_code=404, detail="Unknown favicon variant")

    path = Path(request.app.state.favicon_dir) / f"{stem}.png"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Favicon not found")

    return FileResponse(
        path,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"},
    )
