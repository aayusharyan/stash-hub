// GraphQL queries for tags - paginated list and single tag detail with hierarchy.

import { gql } from "@apollo/client/core";

export const FIND_TAGS = gql`
  query FindTags($filter: FindFilterType, $tag_filter: TagFilterType) {
    findTags(filter: $filter, tag_filter: $tag_filter) {
      count
      tags {
        id
        name
        image_path
        scene_count
        performer_count
        aliases
      }
    }
  }
`;

export const FIND_TAG = gql`
  query FindTag($id: ID!) {
    findTag(id: $id) {
      id
      name
      aliases
      image_path
      scene_count
      performer_count
      parents {
        id
        name
        scene_count
      }
      children {
        id
        name
        scene_count
      }
    }
  }
`;
