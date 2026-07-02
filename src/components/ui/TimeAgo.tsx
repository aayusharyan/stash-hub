"use client";

// Renders a date as a relative time string (e.g. "3 months ago") using the native
// Intl.RelativeTimeFormat API. Hovering shows the full absolute date via the browser's
// native tooltip, consistent with how long titles are revealed on hover elsewhere in the app.

import { formatRelativeTime, formatDate } from "@/lib/utils";

interface Props {
  date?: string;
  className?: string;
}

// Displays relative time as the label and the absolute formatted date on hover.
export function TimeAgo({ date, className }: Props) {
  if (!date) return null;

  const relative = formatRelativeTime(date);
  const absolute = formatDate(date);

  return (
    <span className={className} title={absolute}>
      {relative}
    </span>
  );
}
