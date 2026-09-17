# REST endpoint powering the header live-search dropdown. Runs the combined
# suggestions query that returns a few scenes, performers, studios and tags in
# one round-trip to Stash.

from typing import Annotated, Any

from fastapi import APIRouter, Depends

from .. import stash_client as gql
from ..stash_client import StashClient
from ..util import proxy_media_urls
from .deps import get_stash

router = APIRouter(tags=["search"])


# Returns mixed suggestions for a query string. Empty payload for very short
# queries so the frontend does not fire a pointless upstream call.
@router.get("/search/suggestions")
async def search_suggestions(
    stash: Annotated[StashClient, Depends(get_stash)],
    q: str = "",
) -> dict[str, Any]:
    if len(q.strip()) < 2:
        return {
            "findScenes": {"scenes": []},
            "findPerformers": {"performers": []},
            "findStudios": {"studios": []},
            "findTags": {"tags": []},
        }
    data = await stash.query(gql.SEARCH_SUGGESTIONS, {"q": q.strip()})
    return proxy_media_urls(data)
