# REST endpoints for performers: a paginated/filterable list and a single
# performer profile. Gender is the only supported list filter, matching the UI.

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from .. import stash_client as gql
from ..config import get_settings
from ..stash_client import StashClient
from ..util import proxy_media_urls
from .deps import get_stash

router = APIRouter(tags=["performers"])


# Paginated performer list with an optional gender filter pill.
@router.get("/performers")
async def list_performers(
    stash: Annotated[StashClient, Depends(get_stash)],
    page: int = 1,
    per_page: int | None = None,
    sort: str = "scenes_count",
    dir: str = "DESC",
    q: str | None = None,
    gender: str | None = None,
) -> dict[str, Any]:
    per_page = per_page or get_settings().page_size

    flt: dict[str, Any] = {"page": page, "per_page": per_page, "sort": sort, "direction": dir}
    if q:
        flt["q"] = q

    performer_filter = None
    if gender:
        performer_filter = {"gender": {"value": gender, "modifier": "EQUALS"}}

    data = await stash.query(
        gql.FIND_PERFORMERS,
        {"filter": flt, "performer_filter": performer_filter},
    )
    return proxy_media_urls(data["findPerformers"])


# Full profile for one performer used by the detail page.
@router.get("/performers/{performer_id}")
async def get_performer(
    performer_id: str,
    stash: Annotated[StashClient, Depends(get_stash)],
) -> dict[str, Any]:
    data = await stash.query(gql.FIND_PERFORMER, {"id": performer_id})
    performer = data.get("findPerformer")
    if not performer:
        raise HTTPException(status_code=404, detail="Performer not found")
    return proxy_media_urls(performer)
