# REST endpoint returning library-wide aggregate statistics for the home dashboard.

from typing import Annotated, Any

from fastapi import APIRouter, Depends

from .. import stash_client as gql
from ..stash_client import StashClient
from .deps import get_stash

router = APIRouter(tags=["stats"])


# Returns counts and totals across the whole Stash library.
@router.get("/stats")
async def get_stats(
    stash: Annotated[StashClient, Depends(get_stash)],
) -> dict[str, Any]:
    data = await stash.query(gql.GET_STATS)
    return data["stats"]
