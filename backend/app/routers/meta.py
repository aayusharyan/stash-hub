# Meta endpoints that are not Stash data: runtime config for the SPA.

from fastapi import APIRouter

from ..config import get_settings

router = APIRouter(tags=["meta"])


# Runtime configuration the browser needs. These are the only server values ever
# exposed to the client; the internal URL and API key are never included.
@router.get("/config")
async def get_config() -> dict[str, object]:
    settings = get_settings()
    return {"externalUrl": settings.stash_external_url, "pageSize": settings.page_size}
