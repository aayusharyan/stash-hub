// GraphQL queries for studios - paginated list and full single-studio detail.

import { gql } from "@apollo/client/core";

export const FIND_STUDIOS = gql`
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
        parent_studio {
          id
          name
          image_path
        }
      }
    }
  }
`;

export const FIND_STUDIO = gql`
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
      parent_studio {
        id
        name
        image_path
      }
      child_studios {
        id
        name
        image_path
        scene_count
      }
      tags {
        id
        name
        image_path
        scene_count
      }
    }
  }
`;
