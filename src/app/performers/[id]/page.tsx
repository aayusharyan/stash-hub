"use client";

// Performer detail page. Shows a hero banner with the performer's photo, bio, physical
// details, social links, and a paginated grid of their scenes.

import React from "react";
import { useQuery } from "@apollo/client/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ExternalLink, Link2, Pencil } from "lucide-react";
import ReactCountryFlag from "react-country-flag";
import { code as toCountryCode } from "country-emoji";
import { FIND_PERFORMER } from "@/lib/graphql/performer-queries";
import { FIND_SCENES_BY_PERFORMER } from "@/lib/graphql/scene-queries";
import { SceneGrid } from "@/components/scene/SceneGrid";
import { TagBadge } from "@/components/tag/TagBadge";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { ageFromBirthdate, genderLabel, toProxyUrl } from "@/lib/utils";
import { TimeAgo } from "@/components/ui/TimeAgo";
import type { Performer, FindScenesResult } from "@/types/stash";

const PAGE_SIZE = parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE ?? "60");

// Small stat tile used in the performer header (video count, rating, etc.).
function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center justify-between px-4 py-2 rounded gap-1" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <span className="text-lg font-bold leading-none" style={{ color: "var(--primary)" }}>{value}</span>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

// Stat-level chip for country/nationality. Shows one clickable SVG flag per nationality,
// each linking to a filtered scene search. Visually matches StatChip's card style.
function CountryChip({ country }: { country: string }) {
  const parts = country.split(/[,/]/).map((s) => s.trim());
  const flags = parts
    .map((part) => ({ label: part, iso: toCountryCode(part) }))
    .filter((f): f is { label: string; iso: string } => !!f.iso);

  if (!flags.length) return null;

  return (
    <div
      className="flex flex-col items-center justify-between px-4 py-2 rounded gap-1"
      style={{ backgroundColor: "var(--bg-secondary)" }}
    >
      <div className="flex items-center gap-2">
        {flags.map(({ iso, label }) => (
          <Link
            key={iso}
            href={`/search?type=videos&performer_country=${encodeURIComponent(label)}`}
            title={label}
            className="transition-opacity hover:opacity-70"
            style={{ lineHeight: 0 }}
          >
            <ReactCountryFlag
              countryCode={iso}
              svg
              style={{ width: "1.6em", height: "1.2em" }}
            />
          </Link>
        ))}
      </div>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Country</span>
    </div>
  );
}

export default function PerformerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [imgError, setImgError] = useState(false);

  const { data: perfData, loading: perfLoading } = useQuery<{ findPerformer: Performer }>(FIND_PERFORMER, {
    variables: { id },
  });

  const { data: scenesData, loading: scenesLoading } = useQuery<{ findScenes: FindScenesResult }>(FIND_SCENES_BY_PERFORMER, {
    variables: { performer_id: id, page, per_page: PAGE_SIZE },
  });

  const performer = perfData?.findPerformer;
  const total = scenesData?.findScenes.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (perfLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)" }} />
      </div>
    );
  }

  if (!performer) {
    return (
      <div className="flex flex-col items-center justify-center h-96" style={{ color: "var(--text-muted)" }}>
        <p className="text-xl mb-2">Performer not found</p>
        <Link href="/performers" style={{ color: "var(--primary)" }}>← Back to performers</Link>
      </div>
    );
  }

  const age = ageFromBirthdate(performer.birthdate);

  const details = [
    performer.gender && { label: "Gender", value: genderLabel(performer.gender) },
    age && performer.birthdate && {
      label: "Age",
      value: <>{age} (born <TimeAgo date={performer.birthdate} />)</>,
    },
    performer.death_date && { label: "Died", value: <TimeAgo date={performer.death_date} /> },
    performer.ethnicity && { label: "Ethnicity", value: performer.ethnicity },
    performer.hair_color && { label: "Hair", value: performer.hair_color },
    performer.eye_color && { label: "Eyes", value: performer.eye_color },
    performer.height_cm && { label: "Height", value: `${performer.height_cm} cm` },
    performer.weight && { label: "Weight", value: `${performer.weight} kg` },
    performer.measurements && { label: "Measurements", value: performer.measurements },
    performer.career_length && { label: "Career", value: performer.career_length },
    performer.tattoos && { label: "Tattoos", value: performer.tattoos },
    performer.piercings && { label: "Piercings", value: performer.piercings },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  return (
    <div>
      {/* Full-bleed gradient header: pulls the div to viewport edges regardless of how wide the
          container is, then a centered inner div re-constrains the content to the same max-width. */}
      <div
        style={{
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          width: "100vw",
          background: "linear-gradient(to bottom, #111 0%, var(--bg-primary) 100%)",
          minHeight: 200,
        }}
      >
        <div className="mx-auto w-full max-w-screen-2xl px-3 md:px-6">
        <div className="py-8 flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div
            className="relative flex-shrink-0 rounded overflow-hidden"
            style={{
              width: 140,
              height: 180,

              backgroundColor: "#1a1a1a",
            }}
          >
            {performer.image_path && !imgError ? (
              <Image
                src={toProxyUrl(performer.image_path)!}
                alt={performer.name}
                fill
                className="object-cover object-top"
                onError={() => setImgError(true)}
                unoptimized
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-5xl font-bold" style={{ color: "#444" }}>
                {performer.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Info - name, stats, meta details, bio, tags, and social links all in one column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                {performer.name}
              </h1>
              {performer.favorite && <Heart size={20} fill="var(--primary)" color="var(--primary)" />}
              {/* Opens the performer's edit form directly in Stash */}
              <a
                href={`${process.env.NEXT_PUBLIC_STASH_EXTERNAL_URL}/performers/${id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                title="Edit in Stash"
                className="flex items-center justify-center rounded p-1 transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <Pencil size={16} />
              </a>
            </div>

            {performer.disambiguation && (
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                ({performer.disambiguation})
              </p>
            )}

            {performer.alias_list?.length > 0 && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Also known as: {performer.alias_list.join(", ")}
              </p>
            )}

            {/* Stats row: video count, rating, country flags */}
            <div className="flex flex-wrap gap-3 mt-4">
              <StatChip label="Videos" value={performer.scene_count} />
              {performer.rating100 != null && (
                <StatChip label="Rating" value={`${(performer.rating100 / 20).toFixed(1)}★`} />
              )}
              {performer.country && <CountryChip country={performer.country} />}
            </div>

            {/* Physical / biographical details as inline label–value pairs */}
            {details.length > 0 && (
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
                {details.map(({ label, value }) => (
                  <span key={label} className="text-sm">
                    <span className="text-xs font-medium uppercase tracking-wide mr-1" style={{ color: "var(--text-muted)" }}>
                      {label}
                    </span>
                    <span style={{ color: "var(--text-primary)" }}>{value}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Bio */}
            {performer.details && (
              <p className="text-sm leading-relaxed mt-4 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
                {performer.details}
              </p>
            )}

            {/* Tags */}
            {performer.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {performer.tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} size="sm" />
                ))}
              </div>
            )}

            {/* Social links */}
            <div className="flex flex-wrap gap-3 mt-4">
              {performer.url && (
                <a
                  href={performer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm transition-colors"
                  style={{ color: "var(--primary)" }}
                >
                  <ExternalLink size={14} /> Website
                </a>
              )}
              {performer.twitter && (
                <a
                  href={`https://twitter.com/${performer.twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm transition-colors"
                  style={{ color: "#1da1f2" }}
                >
                  <Link2 size={14} /> Twitter
                </a>
              )}
              {performer.instagram && (
                <a
                  href={`https://instagram.com/${performer.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm transition-colors"
                  style={{ color: "#e1306c" }}
                >
                  <Link2 size={14} /> Instagram
                </a>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Scenes - full width now that the sidebar is gone */}
      <div className="py-6">
        <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-primary)" }}>
          Videos ({total.toLocaleString()})
        </h2>
        <SceneGrid
          scenes={scenesData?.findScenes.scenes ?? []}
          loading={scenesLoading}
        />
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
