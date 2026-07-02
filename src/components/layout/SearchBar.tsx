"use client";

// Live search bar with an instant-results dropdown.
// Typing debounces for 300ms, then fires a single GraphQL query that fetches
// scenes, performers, studios and tags in parallel.
// fetchPolicy "no-cache" is intentional: suggestion results must never be
// written into the shared Apollo InMemoryCache because ScenePathsType and
// the files array have no id, so a partial write would evict fields that
// SCENE_CARD_FRAGMENT depends on and corrupt the rest of the UI.
// Pressing Enter navigates to /search; clicking a suggestion navigates directly to that item's page.

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { Search, Film, Users, Clapperboard, Tag, Clock, X, ArrowRight, ChevronRight, Loader2 } from "lucide-react";
import { SEARCH_SUGGESTIONS } from "@/lib/graphql/scene-queries";
import { toProxyUrl } from "@/lib/utils";

interface SuggestionScene {
  id: string;
  title?: string;
  paths: { screenshot?: string; webp?: string };
  files: { duration: number }[];
  performers: { id: string; name: string }[];
}

interface SuggestionPerformer {
  id: string;
  name: string;
  image_path?: string;
  scene_count: number;
}

interface SuggestionStudio {
  id: string;
  name: string;
  image_path?: string;
  scene_count: number;
}

interface SuggestionTag {
  id: string;
  name: string;
  scene_count: number;
}

interface SuggestionData {
  findScenes: { scenes: SuggestionScene[] };
  findPerformers: { performers: SuggestionPerformer[] };
  findStudios: { studios: SuggestionStudio[] };
  findTags: { tags: SuggestionTag[] };
}

// Converts seconds to a MM:SS display string.
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Derives up to two initials from a studio name (e.g. "Big Productions" → "BP").
// Single-word names use the first two characters; multi-word names use the first
// letter of the first two words.
function getStudioInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

interface SearchBarProps {
  /** Extra class names applied to the wrapper div. */
  className?: string;
  /** Called when the user submits or clicks a result, so parent can close mobile panels. */
  onClose?: () => void;
  autoFocus?: boolean;
}

export function SearchBar({ className = "", onClose, autoFocus }: SearchBarProps) {
  const router = useRouter();

  // query  = raw value shown in the input
  // debouncedQuery = value sent to GraphQL (updates 300ms after typing stops)
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update debouncedQuery 300ms after the user stops typing.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setDebouncedQuery("");
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setOpen(true);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const { data, loading } = useQuery<SuggestionData>(SEARCH_SUGGESTIONS, {
    variables: { q: debouncedQuery },
    skip: debouncedQuery.length < 2,
    // Must not write to the shared cache: ScenePathsType has no id, so Apollo
    // would replace (not merge) the paths object and evict fields like
    // preview/stream that the rest of the app depends on.
    fetchPolicy: "no-cache",
  });

  const handleChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  // Navigate to full search page on form submit (Enter key or button click).
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      if (!q) return;
      setOpen(false);
      onClose?.();
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
    [query, router, onClose]
  );

  // Close dropdown when clicking outside the component.
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  // Close dropdown on Escape key.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setFocused(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const scenes = data?.findScenes.scenes ?? [];
  const performers = data?.findPerformers.performers ?? [];
  const studios = data?.findStudios.studios ?? [];
  const tags = data?.findTags.tags ?? [];
  const hasResults =
    scenes.length > 0 || performers.length > 0 || studios.length > 0 || tags.length > 0;

  function closeDropdown() {
    setOpen(false);
    setFocused(false);
    onClose?.();
  }

  const clearInput = () => {
    setQuery("");
    setDebouncedQuery("");
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="flex w-full">
        {/* Unified pill-shaped search input with icons inside */}
        <div
          className="flex items-center w-full h-9 rounded-full ps-2 pe-1 gap-2 transition-all duration-200"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: focused
              ? "1.5px solid var(--primary)"
              : "1.5px solid var(--border-light)",
            boxShadow: focused ? "0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent)" : "none",
          }}
        >
          {/* Leading search icon or loading spinner */}
          <span
            className="flex-shrink-0 transition-colors"
            style={{ color: focused ? "var(--primary)" : "var(--text-muted)" }}
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Search size={15} />
            )}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => {
              setFocused(true);
              if (debouncedQuery.length >= 2) setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            placeholder="Search videos, performers, studios..."
            className="flex-1 bg-transparent text-sm min-w-0"
            style={{ color: "var(--text-primary)", border: "none", outline: "none" }}
          />

          {/* Clear button, shown only when there is text */}
          {query && (
            <button
              type="button"
              onClick={clearInput}
              className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full transition-colors hover:opacity-80"
              style={{ backgroundColor: "var(--text-muted)", color: "var(--bg-card)" }}
            >
              <X size={11} strokeWidth={3} />
            </button>
          )}

          {/* Submit arrow button */}
          <button
            type="submit"
            className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full transition-all hover:scale-105"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <ArrowRight size={13} color="black" strokeWidth={2.5} />
          </button>
        </div>
      </form>

      {/* Dropdown panel - only rendered while open */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.15)",
            maxHeight: "75vh",
            overflowY: "auto",
          }}
        >
          {/* Loading state with animated skeleton */}
          {loading && !hasResults && (
            <div className="px-4 py-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-14 h-9 rounded-lg flex-shrink-0" style={{ backgroundColor: "var(--bg-secondary)" }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded-full w-3/4" style={{ backgroundColor: "var(--bg-secondary)" }} />
                    <div className="h-2.5 rounded-full w-1/2" style={{ backgroundColor: "var(--bg-secondary)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !hasResults && debouncedQuery.length >= 2 && (
            <div className="px-4 py-8 text-center">
              <Search size={28} className="mx-auto mb-2 opacity-30" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                No results for &quot;{debouncedQuery}&quot;
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Try a different search term
              </p>
            </div>
          )}

          {/* "See all results" action row pinned at the top when results exist */}
          {hasResults && (
            <Link
              href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
              onClick={closeDropdown}
              className="flex items-center gap-3 px-4 py-3 transition-colors group"
              style={{
                borderBottom: "1px solid var(--border-color)",
                backgroundColor: "color-mix(in srgb, var(--primary) 5%, transparent)",
              }}
            >
              <div
                className="flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0"
                style={{ backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
              >
                <Search size={13} style={{ color: "var(--primary)" }} />
              </div>
              <span className="text-sm font-semibold flex-1" style={{ color: "var(--primary)" }}>
                See all results for &quot;{debouncedQuery}&quot;
              </span>
              <ChevronRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
                style={{ color: "var(--primary)" }}
              />
            </Link>
          )}

          {/* Videos */}
          {scenes.length > 0 && (
            <Section icon={<Film size={12} />} label="Videos" viewAllHref={`/search?q=${encodeURIComponent(debouncedQuery)}&type=videos`} onViewAll={closeDropdown}>
              {scenes.map((scene) => (
                <ResultRow key={scene.id} href={`/scenes/${scene.id}`} onClick={closeDropdown}>
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-16 h-10 rounded-lg overflow-hidden bg-black">
                    {scene.paths.screenshot || scene.paths.webp ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={toProxyUrl(scene.paths.screenshot ?? scene.paths.webp) ?? undefined}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: "#555" }}>
                        <Film size={16} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate leading-snug" style={{ color: "var(--text-primary)" }}>
                      {scene.title || `Scene ${scene.id}`}
                    </p>
                    <p className="text-xs truncate mt-0.5 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      {scene.performers.length > 0 && (
                        <span>{scene.performers.slice(0, 2).map((p) => p.name).join(", ")}</span>
                      )}
                      {scene.files[0] && (
                        <>
                          {scene.performers.length > 0 && <span className="opacity-40">·</span>}
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {formatDuration(scene.files[0].duration)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </ResultRow>
              ))}
            </Section>
          )}

          {/* Performers */}
          {performers.length > 0 && (
            <Section icon={<Users size={12} />} label="Performers" viewAllHref={`/search?q=${encodeURIComponent(debouncedQuery)}&type=performers`} onViewAll={closeDropdown}>
              {performers.map((p) => (
                <ResultRow key={p.id} href={`/performers/${p.id}`} onClick={closeDropdown}>
                  {/* Avatar with ring */}
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden"
                    style={{
                      border: "2px solid var(--border-color)",
                      backgroundColor: "var(--bg-secondary)",
                    }}
                  >
                    {p.image_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={toProxyUrl(p.image_path) ?? undefined} alt="" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ color: "#555" }}>
                        <Users size={14} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {p.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {p.scene_count} {p.scene_count === 1 ? "video" : "videos"}
                    </p>
                  </div>
                </ResultRow>
              ))}
            </Section>
          )}

          {/* Studios */}
          {studios.length > 0 && (
            <Section icon={<Clapperboard size={12} />} label="Studios" viewAllHref="/studios" onViewAll={closeDropdown}>
              {studios.map((s) => (
                <ResultRow key={s.id} href={`/studios/${s.id}`} onClick={closeDropdown}>
                  <StudioAvatar name={s.name} imagePath={s.image_path} />

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {s.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {s.scene_count} {s.scene_count === 1 ? "video" : "videos"}
                    </p>
                  </div>
                </ResultRow>
              ))}
            </Section>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <Section icon={<Tag size={12} />} label="Tags" viewAllHref="/tags" onViewAll={closeDropdown}>
              <div className="px-4 pb-3 pt-1.5 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tags/${t.id}`}
                    onClick={closeDropdown}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:scale-105"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--primary) 10%, var(--bg-secondary))",
                      color: "var(--text-secondary)",
                      border: "1px solid color-mix(in srgb, var(--primary) 20%, var(--border-color))",
                    }}
                  >
                    <Tag size={9} style={{ color: "var(--primary)" }} />
                    {t.name}
                    <span
                      className="ml-0.5 px-1 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      {t.scene_count}
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

// Rounded-square studio thumbnail that falls back to initials if the image
// is missing or fails to load (broken URL / 404).
function StudioAvatar({ name, imagePath }: { name: string; imagePath?: string }) {
  const [imgError, setImgError] = useState(false);
  const showImage = imagePath && !imgError;

  return (
    <div
      className="flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={toProxyUrl(imagePath) ?? undefined}
          alt=""
          className="w-full h-full object-contain p-1"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[11px] font-bold leading-none select-none" style={{ color: "var(--text-muted)" }}>
          {getStudioInitials(name)}
        </span>
      )}
    </div>
  );
}

// Reusable row component for scene, performer and studio results.
// Shows a hover chevron arrow on the right to indicate navigation.
function ResultRow({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors group hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
    >
      {children}
      <ChevronRight
        size={14}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5"
        style={{ color: "var(--text-muted)" }}
      />
    </Link>
  );
}

// Section header inside the dropdown with an icon, label and "View all" link.
function Section({
  icon,
  label,
  viewAllHref,
  onViewAll,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  viewAllHref: string;
  onViewAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: "1px solid var(--border-color)" }}>
      <div className="flex items-center justify-between px-4 py-2">
        <span
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          {icon}
          {label}
        </span>
        <Link
          href={viewAllHref}
          onClick={onViewAll}
          className="text-[11px] font-medium transition-colors hover:underline flex items-center gap-0.5"
          style={{ color: "var(--primary)" }}
        >
          View all
          <ChevronRight size={11} />
        </Link>
      </div>
      {children}
    </div>
  );
}
