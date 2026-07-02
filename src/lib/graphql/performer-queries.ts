// GraphQL queries for performers - list (with filters) and single detail fetch.

import { gql } from "@apollo/client/core";
import { TAG_FRAGMENT } from "./fragments";

export const FIND_PERFORMERS = gql`
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
        tags {
          ...TagParts
        }
      }
    }
  }
  ${TAG_FRAGMENT}
`;

export const FIND_PERFORMER = gql`
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
      tags {
        ...TagParts
      }
    }
  }
  ${TAG_FRAGMENT}
`;
