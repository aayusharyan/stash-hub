// GraphQL query for library-wide statistics shown on the home page dashboard.

import { gql } from "@apollo/client/core";

export const GET_STATS = gql`
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
`;
