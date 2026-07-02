// Reusable GraphQL fragments shared across multiple queries.
// Keeping field selections in one place prevents drift when the Stash schema changes.

import { gql } from "@apollo/client/core";

export const TAG_FRAGMENT = gql`
  fragment TagParts on Tag {
    id
    name
    image_path
    scene_count
  }
`;

export const PERFORMER_SLIM_FRAGMENT = gql`
  fragment PerformerSlim on Performer {
    id
    name
    gender
    image_path
    scene_count
    favorite
    rating100
  }
`;

export const STUDIO_SLIM_FRAGMENT = gql`
  fragment StudioSlim on Studio {
    id
    name
    image_path
    scene_count
    rating100
  }
`;

export const SCENE_CARD_FRAGMENT = gql`
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
    paths {
      screenshot
      preview
      webp
      stream
    }
    files {
      duration
      width
      height
      size
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
  }
  ${TAG_FRAGMENT}
  ${PERFORMER_SLIM_FRAGMENT}
  ${STUDIO_SLIM_FRAGMENT}
`;
