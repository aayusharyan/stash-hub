# REST endpoints for tags: a paginated list and a single tag detail with its
# parent/child hierarchy.

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException

from .. import stash_client as gql
from ..config import get_settings
from ..stash_client import StashClient
from ..util import proxy_media_urls
from .deps import get_stash

router = APIRouter(tags=["tags"])


# Paginated, sortable tag list.
@router.get("/tags")
async def list_tags(
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

    data = await stash.query(gql.FIND_TAGS, {"filter": flt})
    return proxy_media_urls(data["findTags"])


# Full detail for one tag including parent and child tags.
@router.get("/tags/{tag_id}")
async def get_tag(
    tag_id: str,
    stash: Annotated[StashClient, Depends(get_stash)],
) -> dict[str, Any]:
    data = await stash.query(gql.FIND_TAG, {"id": tag_id})
    tag = data.get("findTag")
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return proxy_media_urls(tag)
