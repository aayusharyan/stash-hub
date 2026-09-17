// TypeScript type definitions that mirror the shape of the Stash data returned
// by the Python REST API. Each interface maps 1:1 to a Stash entity so
// components receive strongly-typed data without extra transformation.

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
  fingerprints?: { type: string; value: string }[];
}

// Media URL paths returned for a scene (screenshots, streams, VTT, etc.).
// The backend has already rewritten these to same-origin /api/stash paths.
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
  tags?: Tag[];
}

// A classification label attachable to scenes and performers, forming a
// hierarchy through the parents / children arrays.
export interface Tag {
  id: string;
  name: string;
  aliases?: string[];
  image_path?: string;
  scene_count: number;
  performer_count?: number;
  parents?: Tag[];
  children?: Tag[];
}

// A person who appears in scenes, with optional social links and attributes.
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
  alias_list?: string[];
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

// A production company or brand, nestable via parent_studio / child_studios.
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

// A single video entry in the library with all associated metadata.
export interface Scene {
  id: string;
  title?: string;
  details?: string;
  url?: string;
  date?: string;
  rating100?: number;
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

// Paginated response wrappers returned by the list endpoints.
export interface FindScenesResult {
  count: number;
  duration: number;
  filesize: number;
  scenes: Scene[];
}

export interface FindPerformersResult {
  count: number;
  performers: Performer[];
}

export interface FindStudiosResult {
  count: number;
  studios: Studio[];
}

export interface FindTagsResult {
  count: number;
  tags: Tag[];
}

// Aggregate library statistics for the home dashboard.
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

// Lightweight result rows for the live search dropdown.
export interface SuggestionScene {
  id: string;
  title?: string;
  paths: { screenshot?: string; webp?: string };
  files: { duration: number }[];
  performers: { id: string; name: string }[];
}

export interface SuggestionData {
  findScenes: { scenes: SuggestionScene[] };
  findPerformers: { performers: { id: string; name: string; image_path?: string; scene_count: number }[] };
  findStudios: { studios: { id: string; name: string; image_path?: string; scene_count: number }[] };
  findTags: { tags: { id: string; name: string; scene_count: number }[] };
}

// Runtime configuration served by GET /api/config.
export interface AppConfig {
  externalUrl: string;
  pageSize: number;
}
