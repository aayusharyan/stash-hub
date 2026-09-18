# REST endpoints for studios: a paginated list and a single studio detail with
# its parent, child studios and tags.

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from .. import stash_client as gql
from ..config import get_settings
from ..stash_client import StashClient
from ..util import proxy_media_urls
from .deps import get_stash

router = APIRouter(tags=["studios"])


# Paginated, sortable studio list.
@router.get("/studios")
async def list_studios(
    stash: Annotated[StashClient, Depends(get_stash)],
    page: int = 1,
    per_page: int | None = None,
    sort: str = "random",
    dir: str = "DESC",
    q: str | None = None,
) -> dict[str, Any]:
    per_page = per_page or get_settings().page_size

    flt: dict[str, Any] = {"page": page, "per_page": per_page, "sort": sort, "direction": dir}
    if q:
        flt["q"] = q

    data = await stash.query(gql.FIND_STUDIOS, {"filter": flt})
    return proxy_media_urls(data["findStudios"])


# Full detail for one studio including hierarchy.
@router.get("/studios/{studio_id}")
async def get_studio(
    studio_id: str,
    stash: Annotated[StashClient, Depends(get_stash)],
) -> dict[str, Any]:
    data = await stash.query(gql.FIND_STUDIO, {"id": studio_id})
    studio = data.get("findStudio")
    if not studio:
        raise HTTPException(status_code=404, detail="Studio not found")
    return proxy_media_urls(studio)
