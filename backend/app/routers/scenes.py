# REST endpoints for scenes: the unified paginated list, single-scene detail,
# and the two mutations (play count, rating). The list endpoint translates flat
# query params into Stash's filter + scene_filter so a single route serves the
# home feed, browse, search, related and history views.

from typing import Annotated, Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from .. import stash_client as gql
from ..config import get_settings
from ..stash_client import StashClient
from ..util import proxy_media_urls
from .deps import get_stash

router = APIRouter(tags=["scenes"])


# Turns a comma-separated query string into a clean list of non-empty ids.
def _csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [part for part in (p.strip() for p in value.split(",")) if part]


# Assembles Stash's scene_filter object from the individual REST parameters.
# Returns None when no criteria apply so the GraphQL variable stays unset.
def _build_scene_filter(
    performer_id: str | None,
    studio_id: str | None,
    tag_id: str | None,
    performers: list[str],
    tags: list[str],
    played: bool | None,
    min_rating: int | None,
    performer_country: str | None,
) -> dict[str, Any] | None:
    sf: dict[str, Any] = {}

    performer_values = performers or ([performer_id] if performer_id else [])
    if performer_values:
        sf["performers"] = {"value": performer_values, "modifier": "INCLUDES"}

    if studio_id:
        sf["studios"] = {"value": [studio_id], "modifier": "INCLUDES"}

    tag_values = tags or ([tag_id] if tag_id else [])
    if tag_values:
        sf["tags"] = {"value": tag_values, "modifier": "INCLUDES"}

    # played=true keeps watched scenes; played=false keeps unwatched ones.
    if played is True:
        sf["play_count"] = {"value": 0, "modifier": "GREATER_THAN"}
    elif played is False:
        sf["play_count"] = {"value": 1, "modifier": "LESS_THAN"}

    if min_rating is not None:
        sf["rating100"] = {"value": min_rating, "modifier": "GREATER_THAN"}

    if performer_country:
        sf["performers_filter"] = {
            "country": {"value": performer_country, "modifier": "INCLUDES"}
        }

    return sf or None


# Paginated, filterable, sortable scene list. Every browse/search/related/history
# view maps onto this one endpoint through query parameters.
@router.get("/scenes")
async def list_scenes(
    stash: Annotated[StashClient, Depends(get_stash)],
    page: int = 1,
    per_page: int | None = None,
    sort: str = "random",
    dir: str = "DESC",
    q: str | None = None,
    performer_id: str | None = None,
    studio_id: str | None = None,
    tag_id: str | None = None,
    performers: str | None = None,
    tags: str | None = None,
    played: bool | None = None,
    min_rating: int | None = None,
    performer_country: str | None = None,
) -> dict[str, Any]:
    per_page = per_page or get_settings().page_size

    # Stash sorts scenes by "rating"; "rating100" is only valid as a filter field.
    # Accept it as an alias so older bookmarked URLs don't 502 on an invalid sort.
    if sort == "rating100":
        sort = "rating"

    flt: dict[str, Any] = {"page": page, "per_page": per_page, "sort": sort, "direction": dir}
    if q:
        flt["q"] = q

    scene_filter = _build_scene_filter(
        performer_id,
        studio_id,
        tag_id,
        _csv(performers),
        _csv(tags),
        played,
        min_rating,
        performer_country,
    )

    data = await stash.query(gql.FIND_SCENES, {"filter": flt, "scene_filter": scene_filter})
    return proxy_media_urls(data["findScenes"])


# Full detail for one scene, including markers and every media path.
@router.get("/scenes/{scene_id}")
async def get_scene(
    scene_id: str,
    stash: Annotated[StashClient, Depends(get_stash)],
) -> dict[str, Any]:
    data = await stash.query(gql.FIND_SCENE, {"id": scene_id})
    scene = data.get("findScene")
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return proxy_media_urls(scene)


# Records a play for the scene and returns the updated play count.
@router.post("/scenes/{scene_id}/play")
async def add_play(
    scene_id: str,
    stash: Annotated[StashClient, Depends(get_stash)],
) -> dict[str, int]:
    data = await stash.query(gql.SCENE_ADD_PLAY, {"id": scene_id})
    return {"count": data["sceneAddPlay"]["count"]}


# Updates the scene's star rating (0-100 scale) and echoes back the saved value.
@router.patch("/scenes/{scene_id}")
async def update_scene(
    scene_id: str,
    stash: Annotated[StashClient, Depends(get_stash)],
    rating100: Annotated[int, Body(embed=True)],
) -> dict[str, Any]:
    variables = {"input": {"id": scene_id, "rating100": rating100}}
    data = await stash.query(gql.SCENE_UPDATE, variables)
    return data["sceneUpdate"]
