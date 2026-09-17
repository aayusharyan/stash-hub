// Shared utility functions used throughout the app.
// Covers class merging, formatting helpers (duration, file size, date, views),
// media URL proxying, video resolution labels, and performer age calculation.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges Tailwind class strings safely, resolving conflicts (e.g. p-2 vs p-4).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Converts a total number of seconds to a human-readable H:MM:SS or M:SS string.
export function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Formats a library-scale second count for the homepage stats banner.
// Under 24 hours it uses the same H:MM:SS clock as scene lengths; at a day
// or more it switches to compact units (e.g. "1M 4D 13h") so multi-year
// collections stay readable. Years are 365 days, months 30 days.
export function formatTotalDuration(seconds: number, maxUnits = 3): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return formatDuration(0);
  if (seconds < 24 * 3600) return formatDuration(seconds);

  const units: [string, number][] = [
    ["Y", 365 * 24 * 3600],
    ["M", 30 * 24 * 3600],
    ["D", 24 * 3600],
    ["h", 3600],
    ["m", 60],
    ["s", 1],
  ];

  const parts: string[] = [];
  let remaining = Math.floor(seconds);

  for (const [label, size] of units) {
    const count = Math.floor(remaining / size);
    if (count === 0) continue;
    parts.push(`${count}${label}`);
    remaining %= size;
    if (parts.length >= maxUnits) break;
  }

  return parts.length ? parts.join(" ") : formatDuration(0);
}

// Formats a raw byte count into a human-readable string (e.g. "1.4 GB").
export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// Parses an ISO date string and returns a locale-formatted absolute date.
// Falls back to the original string if parsing fails.
export function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Returns a human-readable relative time string using Intl.RelativeTimeFormat
// (e.g. "3 months ago", "yesterday", "2 years ago").
export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absSeconds = Math.abs(diffSeconds);

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (absSeconds < 60) return rtf.format(diffSeconds, "second");
    if (absSeconds < 3600) return rtf.format(Math.round(diffSeconds / 60), "minute");
    if (absSeconds < 86400) return rtf.format(Math.round(diffSeconds / 3600), "hour");
    if (absSeconds < 2592000) return rtf.format(Math.round(diffSeconds / 86400), "day");
    if (absSeconds < 31536000) return rtf.format(Math.round(diffSeconds / 2592000), "month");
    return rtf.format(Math.round(diffSeconds / 31536000), "year");
  } catch {
    return dateStr ?? "";
  }
}

// Formats a play count as a compact view string (e.g. 1200 -> "1.2K views").
export function formatViews(count?: number): string {
  if (!count) return "0 views";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
}

// Converts a Stash 0-100 rating to a percentage integer (used for rating bars).
export function ratingToPercent(rating100?: number): number {
  return rating100 ? Math.round(rating100) : 0;
}

// Rewrites a full media URL to a local proxy path, keeping only path + query.
// The backend already proxies most URLs, so this mainly guards any that arrive
// absolute and normalises them to same-origin /api/stash paths.
export function toProxyUrl(stashMediaUrl: string | null | undefined): string | null {
  if (!stashMediaUrl) return null;
  if (stashMediaUrl.startsWith("/api/stash")) return stashMediaUrl;
  try {
    const url = new URL(stashMediaUrl);
    return `/api/stash${url.pathname}${url.search}`;
  } catch {
    return stashMediaUrl;
  }
}

// Constructs the proxy URL for the direct video stream of a scene by ID.
export function sceneStreamUrl(id: string): string {
  return `/api/stash/scene/${id}/stream`;
}

// Constructs the proxy URL for the screenshot (thumbnail) of a scene by ID.
export function sceneScreenshotUrl(id: string): string {
  return `/api/stash/scene/${id}/screenshot`;
}

// Constructs the proxy URL for a performer's profile image by ID.
export function performerImageUrl(id: string): string {
  return `/api/stash/performer/${id}/image`;
}

// Constructs the proxy URL for a studio's logo image by ID.
export function studioImageUrl(id: string): string {
  return `/api/stash/studio/${id}/image`;
}

// Constructs the proxy URL for a tag's cover image by ID.
export function tagImageUrl(id: string): string {
  return `/api/stash/tag/${id}/image`;
}

// Maps pixel height to a common resolution label (4K, QHD, HD, 720p, 480p, or "NNNp").
export function getResolution(_width?: number, height?: number): string {
  if (!height) return "";
  if (height >= 2160) return "4K";
  if (height >= 1440) return "QHD";
  if (height >= 1080) return "HD";
  if (height >= 720) return "720p";
  if (height >= 480) return "480p";
  return `${height}p`;
}

// Converts a GenderEnum value to a display-friendly label.
export function genderLabel(gender?: string): string {
  const map: Record<string, string> = {
    MALE: "Male",
    FEMALE: "Female",
    TRANSGENDER_MALE: "Trans Male",
    TRANSGENDER_FEMALE: "Trans Female",
    INTERSEX: "Intersex",
    NON_BINARY: "Non-Binary",
  };
  return gender ? (map[gender] ?? gender) : "Unknown";
}

// Calculates a performer's current age from their birthdate, accounting for
// whether their birthday has already passed this year.
export function ageFromBirthdate(birthdate?: string): number | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
