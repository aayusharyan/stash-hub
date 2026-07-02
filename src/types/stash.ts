// TypeScript type definitions that mirror the Stash GraphQL schema.
// Every interface here maps 1:1 to a Stash entity so components receive
// strongly-typed data from Apollo queries without extra transformation.

export type GenderEnum =
  | "MALE"
  | "FEMALE"
  | "TRANSGENDER_MALE"
  | "TRANSGENDER_FEMALE"
  | "INTERSEX"
  | "NON_BINARY";

export type SortDirectionEnum = "ASC" | "DESC";

// Technical metadata for a single video file attached to a scene.
export interface SceneFile {
  id: string;
  path: string;
  size: number;
  duration: number;
  video_codec?: string;
  audio_codec?: string;
  width: number;
  height: number;
  frame_rate?: number;
  bit_rate?: number;
  fingerprints: { type: string; value: string }[];
}

// Media URL paths returned by Stash for a scene (screenshots, streams, VTT, etc.).
export interface ScenePaths {
  screenshot?: string;
  preview?: string;
  stream?: string;
  webp?: string;
  vtt?: string;
  sprite?: string;
  funscript?: string;
  interactive_heatmap?: string;
  caption?: string;
}

// A named chapter bookmark within a scene, each tied to a primary tag.
export interface SceneMarker {
  id: string;
  title: string;
  seconds: number;
  screenshot: string;
  stream: string;
  preview: string;
  primary_tag: Tag;
  tags: Tag[];
}

// A classification label that can be attached to scenes and performers.
// Tags form a hierarchy through the parents / children arrays.
export interface Tag {
  id: string;
  name: string;
  aliases: string[];
  image_path?: string;
  scene_count: number;
  performer_count?: number;
  parents: Tag[];
  children: Tag[];
}

// A person who appears in scenes, with optional social links and physical attributes.
export interface Performer {
  id: string;
  name: string;
  disambiguation?: string;
  url?: string;
  gender?: GenderEnum;
  twitter?: string;
  instagram?: string;
  birthdate?: string;
  ethnicity?: string;
  country?: string;
  eye_color?: string;
  height_cm?: number;
  measurements?: string;
  career_length?: string;
  tattoos?: string;
  piercings?: string;
  alias_list: string[];
  favorite: boolean;
  image_path?: string;
  scene_count: number;
  rating100?: number;
  details?: string;
  death_date?: string;
  hair_color?: string;
  weight?: number;
  tags: Tag[];
}

// A production company or brand that scenes can be associated with.
// Studios can be nested via parent_studio / child_studios.
export interface Studio {
  id: string;
  name: string;
  url?: string;
  parent_studio?: Studio;
  child_studios: Studio[];
  image_path?: string;
  scene_count: number;
  details?: string;
  rating100?: number;
  aliases: string[];
  tags: Tag[];
}

// A single video entry in the Stash library, with all associated metadata.
export interface Scene {
  id: string;
  title?: string;
  details?: string;
  url?: string;
  date?: string;
  rating100?: number;
  o_counter?: number;
  organized: boolean;
  interactive: boolean;
  play_count?: number;
  last_played_at?: string;
  created_at: string;
  updated_at: string;
  paths: ScenePaths;
  files: SceneFile[];
  studio?: Studio;
  tags: Tag[];
  performers: Performer[];
  scene_markers: SceneMarker[];
}

// Paginated response wrapper returned by the findScenes GraphQL query.
export interface FindScenesResult {
  count: number;
  duration: number;
  filesize: number;
  scenes: Scene[];
}

// Paginated response wrapper returned by the findPerformers GraphQL query.
export interface FindPerformersResult {
  count: number;
  performers: Performer[];
}

// Paginated response wrapper returned by the findStudios GraphQL query.
export interface FindStudiosResult {
  count: number;
  studios: Studio[];
}

// Paginated response wrapper returned by the findTags GraphQL query.
export interface FindTagsResult {
  count: number;
  tags: Tag[];
}

export interface FindMoviesResult {
  count: number;
  movies: unknown[];
}

// Aggregate library statistics returned by the stats GraphQL query.
export interface StatsResult {
  scene_count: number;
  scenes_size: number;
  scenes_duration: number;
  image_count: number;
  gallery_count: number;
  performer_count: number;
  studio_count: number;
  movie_count: number;
  tag_count: number;
}

// Generic pagination and sorting arguments used by most findX queries.
export interface FindFilterType {
  q?: string;
  page?: number;
  per_page?: number;
  sort?: string;
  direction?: SortDirectionEnum;
}

// Scene-specific filter criteria applied on top of FindFilterType.
export interface SceneFilterType {
  tags?: { value: string[]; modifier: "INCLUDES" | "INCLUDES_ALL" | "EXCLUDES" };
  studios?: { value: string[]; modifier: "INCLUDES" | "EXCLUDES" };
  performers?: { value: string[]; modifier: "INCLUDES" | "INCLUDES_ALL" | "EXCLUDES" };
  rating100?: { value: number; modifier: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" };
  organized?: boolean;
  interactive?: boolean;
  // Filters scenes by attributes of their performers (e.g. country).
  performers_filter?: PerformerFilterType;
}

// Performer-specific filter criteria - also used nested inside SceneFilterType.performers_filter.
export interface PerformerStringFilter {
  value: string;
  modifier: "EQUALS" | "NOT_EQUALS" | "INCLUDES" | "EXCLUDES" | "MATCHES_REGEX";
}

// Performer-specific filter criteria for gender, favorites, country, and tag filtering.
export interface PerformerFilterType {
  gender?: { value: GenderEnum; modifier: "EQUALS" | "NOT_EQUALS" };
  favorite?: boolean;
  tags?: { value: string[]; modifier: "INCLUDES" | "INCLUDES_ALL" | "EXCLUDES" };
  country?: PerformerStringFilter;
}
