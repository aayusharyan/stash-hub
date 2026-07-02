// GraphQL queries and mutations for scenes.
// Includes full detail fetch, filtered list queries, and like/play mutations.

import { gql } from "@apollo/client/core";
import { SCENE_CARD_FRAGMENT, TAG_FRAGMENT, PERFORMER_SLIM_FRAGMENT, STUDIO_SLIM_FRAGMENT } from "./fragments";

// Lightweight query used by the live search dropdown to fetch a handful of results across all categories at once.
export const SEARCH_SUGGESTIONS = gql`
  query SearchSuggestions($q: String!) {
    findScenes(filter: { q: $q, per_page: 4, page: 1, sort: "date", direction: DESC }) {
      scenes {
        id
        title
        paths {
          screenshot
          webp
        }
        files {
          duration
        }
        performers {
          id
          name
        }
      }
    }
    findPerformers(filter: { q: $q, per_page: 4, page: 1, sort: "name", direction: ASC }) {
      performers {
        id
        name
        image_path
        scene_count
      }
    }
    findStudios(filter: { q: $q, per_page: 3, page: 1, sort: "name", direction: ASC }) {
      studios {
        id
        name
        image_path
        scene_count
      }
    }
    findTags(filter: { q: $q, per_page: 4, page: 1, sort: "name", direction: ASC }) {
      tags {
        id
        name
        scene_count
      }
    }
  }
`;

export const FIND_SCENES = gql`
  query FindScenes(
    $filter: FindFilterType
    $scene_filter: SceneFilterType
  ) {
    findScenes(filter: $filter, scene_filter: $scene_filter) {
      count
      duration
      filesize
      scenes {
        ...SceneCard
      }
    }
  }
  ${SCENE_CARD_FRAGMENT}
`;

export const FIND_SCENE = gql`
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
        screenshot
        preview
        stream
        webp
        vtt
        sprite
        funscript
        interactive_heatmap
      }
      files {
        id
        path
        size
        duration
        video_codec
        audio_codec
        width
        height
        frame_rate
        bit_rate
      }
      studio {
        ...StudioSlim
      }
      tags {
        ...TagParts
      }
      performers {
        ...PerformerSlim
      }
      scene_markers {
        id
        title
        seconds
        screenshot
        stream
        preview
        primary_tag {
          id
          name
        }
      }
    }
  }
  ${TAG_FRAGMENT}
  ${PERFORMER_SLIM_FRAGMENT}
  ${STUDIO_SLIM_FRAGMENT}
`;


export const FIND_SCENES_BY_PERFORMER = gql`
  query FindScenesByPerformer($performer_id: ID!, $page: Int, $per_page: Int) {
    findScenes(
      filter: { page: $page, per_page: $per_page, sort: "date", direction: DESC }
      scene_filter: { performers: { value: [$performer_id], modifier: INCLUDES } }
    ) {
      count
      scenes {
        ...SceneCard
      }
    }
  }
  ${SCENE_CARD_FRAGMENT}
`;

export const FIND_SCENES_BY_STUDIO = gql`
  query FindScenesByStudio($studio_id: ID!, $page: Int, $per_page: Int) {
    findScenes(
      filter: { page: $page, per_page: $per_page, sort: "date", direction: DESC }
      scene_filter: { studios: { value: [$studio_id], modifier: INCLUDES } }
    ) {
      count
      scenes {
        ...SceneCard
      }
    }
  }
  ${SCENE_CARD_FRAGMENT}
`;

export const FIND_SCENES_BY_TAG = gql`
  query FindScenesByTag($tag_id: ID!, $page: Int, $per_page: Int) {
    findScenes(
      filter: { page: $page, per_page: $per_page, sort: "date", direction: DESC }
      scene_filter: { tags: { value: [$tag_id], modifier: INCLUDES } }
    ) {
      count
      scenes {
        ...SceneCard
      }
    }
  }
  ${SCENE_CARD_FRAGMENT}
`;

// Fetches scenes that have been played at least once, sorted by most recently watched.
// Used to power the Watch History page.
export const FIND_WATCH_HISTORY = gql`
  query FindWatchHistory($page: Int, $per_page: Int) {
    findScenes(
      filter: { sort: "last_played_at", direction: DESC, page: $page, per_page: $per_page }
      scene_filter: { play_count: { value: 0, modifier: GREATER_THAN } }
    ) {
      count
      scenes {
        ...SceneCard
      }
    }
  }
  ${SCENE_CARD_FRAGMENT}
`;

// Increments the like counter for a scene and returns the new count.
export const SCENE_INCREMENT_O = gql`
  mutation SceneIncrementO($id: ID!) {
    sceneIncrementO(id: $id)
  }
`;

// Decrements the like counter for a scene and returns the new count.
export const SCENE_DECREMENT_O = gql`
  mutation SceneDecrementO($id: ID!) {
    sceneDecrementO(id: $id)
  }
`;

// Records a play for a scene (Stash ≥ v0.27). Returns the new play_count.
// The `times` argument is optional - omitting it defaults to the current server timestamp.
export const SCENE_ADD_PLAY = gql`
  mutation SceneAddPlay($id: ID!) {
    sceneAddPlay(id: $id) {
      count
    }
  }
`;

// Updates mutable scene fields. Only `id` is required in the input; all other
// fields are optional, so we can send just `rating100` without touching anything else.
export const SCENE_UPDATE = gql`
  mutation SceneUpdate($input: SceneUpdateInput!) {
    sceneUpdate(input: $input) {
      id
      rating100
    }
  }
`;
