# Meta endpoints that are not Stash data: runtime config for the SPA.

from fastapi import APIRouter

from ..config import get_settings

router = APIRouter(tags=["meta"])


# Runtime configuration the browser needs. The API key is never included.
# When STASH_EXTERNAL_URL is unset, the internal URL is mirrored as externalUrl
# for open/edit links only; an empty EXTERNAL value yields "" so the SPA hides them.
@router.get("/config")
async def get_config() -> dict[str, object]:
    settings = get_settings()
    raw = (
        settings.stash_internal_url
        if settings.stash_external_url is None
        else settings.stash_external_url
    )
    external = raw.rstrip("/") if raw else ""
    return {"externalUrl": external, "pageSize": settings.page_size}
