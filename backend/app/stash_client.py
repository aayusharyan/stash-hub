# Async client that talks to the upstream Stash GraphQL API.
# It holds every GraphQL document the backend needs (ported from the original
# frontend query files) and a thin executor that injects the API key and returns
# the decoded data object. All REST routers go through this single client.

from typing import Any

import httpx
from fastapi import HTTPException

from .config import get_settings

# Reusable field selections shared across queries. Kept as plain strings and
# concatenated into each document, since Python has no gql fragment composition.
_TAG_PARTS = """
fragment TagParts on Tag {
  id
  name
  image_path
  scene_count
}
"""

_PERFORMER_SLIM = """
fragment PerformerSlim on Performer {
  id
  name
  gender
  image_path
  scene_count
  favorite
  rating100
}
"""

_STUDIO_SLIM = """
fragment StudioSlim on Studio {
  id
  name
  image_path
  scene_count
  rating100
}
"""

_SCENE_CARD = (
    """
fragment SceneCard on Scene {
  id
  title
  date
  rating100
  play_count
  last_played_at
  organized
  interactive
  created_at
  paths { screenshot preview webp stream }
  files { duration width height size }
  studio { ...StudioSlim }
  tags { ...TagParts }
  performers { ...PerformerSlim }
}
"""
    + _TAG_PARTS
    + _PERFORMER_SLIM
    + _STUDIO_SLIM
)

# Combined-category document backing the live search dropdown.
SEARCH_SUGGESTIONS = """
query SearchSuggestions($q: String!) {
  findScenes(filter: { q: $q, per_page: 4, page: 1, sort: "date", direction: DESC }) {
    scenes {
      id
      title
      paths { screenshot webp }
      files { duration }
      performers { id name }
    }
  }
  findPerformers(filter: { q: $q, per_page: 4, page: 1, sort: "name", direction: ASC }) {
    performers { id name image_path scene_count }
  }
  findStudios(filter: { q: $q, per_page: 3, page: 1, sort: "name", direction: ASC }) {
    studios { id name image_path scene_count }
  }
  findTags(filter: { q: $q, per_page: 4, page: 1, sort: "name", direction: ASC }) {
    tags { id name scene_count }
  }
}
"""

# Generic paginated scene list. filter + scene_filter are built server-side from
# the REST query parameters to cover every list use-case in one endpoint.
FIND_SCENES = (
    """
query FindScenes($filter: FindFilterType, $scene_filter: SceneFilterType) {
  findScenes(filter: $filter, scene_filter: $scene_filter) {
    count
    duration
    filesize
    scenes { ...SceneCard }
  }
}
"""
    + _SCENE_CARD
)

# Full detail for a single scene including all media paths, file specs and markers.
FIND_SCENE = (
    """
query FindScene($id: ID!) {
  findScene(id: $id) {
    id
    title
    details
    url
    date
    rating100
    o_counter
    play_count
    organized
    interactive
    created_at
    updated_at
    paths {
      screenshot preview stream webp vtt sprite funscript interactive_heatmap
    }
    files {
      id path size duration video_codec audio_codec width height frame_rate bit_rate
    }
    studio { ...StudioSlim }
    tags { ...TagParts }
    performers { ...PerformerSlim }
    scene_markers {
      id
      title
      seconds
      screenshot
      stream
      preview
      primary_tag { id name }
    }
  }
}
"""
    + _TAG_PARTS
    + _PERFORMER_SLIM
    + _STUDIO_SLIM
)

# Paginated performer list with the fields the cards and filters need.
FIND_PERFORMERS = (
    """
query FindPerformers($filter: FindFilterType, $performer_filter: PerformerFilterType) {
  findPerformers(filter: $filter, performer_filter: $performer_filter) {
    count
    performers {
      id
      name
      gender
      image_path
      scene_count
      favorite
      rating100
      birthdate
      country
      ethnicity
      tags { ...TagParts }
    }
  }
}
"""
    + _TAG_PARTS
)

# Full performer profile used by the detail page.
FIND_PERFORMER = (
    """
query FindPerformer($id: ID!) {
  findPerformer(id: $id) {
    id
    name
    disambiguation
    gender
    url
    twitter
    instagram
    birthdate
    ethnicity
    country
    eye_color
    height_cm
    measurements
    career_length
    tattoos
    piercings
    alias_list
    favorite
    image_path
    scene_count
    rating100
    details
    death_date
    hair_color
    weight
    tags { ...TagParts }
  }
}
"""
    + _TAG_PARTS
)

# Paginated studio list with parent linkage for the cards.
FIND_STUDIOS = """
query FindStudios($filter: FindFilterType, $studio_filter: StudioFilterType) {
  findStudios(filter: $filter, studio_filter: $studio_filter) {
    count
    studios {
      id
      name
      url
      image_path
      scene_count
      rating100
      details
      parent_studio { id name image_path }
    }
  }
}
"""

# Full studio detail including parent, children and tags.
FIND_STUDIO = """
query FindStudio($id: ID!) {
  findStudio(id: $id) {
    id
    name
    url
    image_path
    scene_count
    rating100
    details
    aliases
    parent_studio { id name image_path }
    child_studios { id name image_path scene_count }
    tags { id name image_path scene_count }
  }
}
"""

# Paginated tag list with counts and aliases.
FIND_TAGS = """
query FindTags($filter: FindFilterType, $tag_filter: TagFilterType) {
  findTags(filter: $filter, tag_filter: $tag_filter) {
    count
    tags { id name image_path scene_count performer_count aliases }
  }
}
"""

# Full tag detail including parent/child hierarchy.
FIND_TAG = """
query FindTag($id: ID!) {
  findTag(id: $id) {
    id
    name
    aliases
    image_path
    scene_count
    performer_count
    parents { id name scene_count }
    children { id name scene_count }
  }
}
"""

# Library-wide aggregate statistics for the home dashboard.
GET_STATS = """
query GetStats {
  stats {
    scene_count
    scenes_size
    scenes_duration
    image_count
    gallery_count
    performer_count
    studio_count
    movie_count
    tag_count
  }
}
"""

# Mutations mirroring the four scene actions the UI can trigger.
SCENE_INCREMENT_O = "mutation SceneIncrementO($id: ID!) { sceneIncrementO(id: $id) }"
SCENE_DECREMENT_O = "mutation SceneDecrementO($id: ID!) { sceneDecrementO(id: $id) }"
SCENE_ADD_PLAY = "mutation SceneAddPlay($id: ID!) { sceneAddPlay(id: $id) { count } }"
SCENE_UPDATE = """
mutation SceneUpdate($input: SceneUpdateInput!) {
  sceneUpdate(input: $input) { id rating100 }
}
"""


class StashClient:
    """Thin async wrapper around the Stash /graphql endpoint.

    A single instance is shared per worker process and reuses one pooled
    httpx.AsyncClient so GraphQL calls and media proxying share connections.
    """

    def __init__(self, client: httpx.AsyncClient):
        self._client = client
        self._settings = get_settings()

    # Builds the auth header, injecting the Stash API key only when one is set.
    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._settings.stash_api_key:
            headers["ApiKey"] = self._settings.stash_api_key
        return headers

    # Executes a GraphQL document and returns its data object. GraphQL-level
    # errors are surfaced as HTTP 502 so the frontend can show a failure state.
    async def query(self, document: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = {"query": document, "variables": variables or {}}
        try:
            response = await self._client.post(
                f"{self._settings.stash_base}/graphql",
                json=payload,
                headers=self._headers(),
            )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Stash unreachable: {exc}") from exc

        if response.status_code >= 400:
            raise HTTPException(status_code=502, detail="Stash returned an error status")

        body = response.json()
        if body.get("errors"):
            first = body["errors"][0].get("message", "GraphQL error")
            raise HTTPException(status_code=502, detail=first)
        return body.get("data", {})
