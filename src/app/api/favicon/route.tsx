// Dynamic favicon endpoint. Accepts ?accent=<key>&theme=<dark|light> and returns
// a 32×32 PNG of the "S" mark in the matching accent colour on a theme-appropriate
// background. Cached at CDN / browser level for 1 hour.

import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

// Maps every accent key to its hex colour - mirrors ACCENT_OPTIONS in ThemeContext.
const ACCENT_COLORS: Record<string, string> = {
  orange: "#ff9000",
  blue:   "#0d6efd",
  red:    "#e50914",
  purple: "#9147ff",
  green:  "#1db954",
  teal:   "#00b4b4",
};

export function GET(request: NextRequest) {
  const accent = request.nextUrl.searchParams.get("accent") ?? "orange";
  const theme  = request.nextUrl.searchParams.get("theme")  ?? "dark";
  const color  = ACCENT_COLORS[accent] ?? ACCENT_COLORS.orange;
  const bg     = theme === "light" ? "#f0f0f0" : "#111111";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bg,
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 900,
            color,
            fontFamily: "sans-serif",
            lineHeight: 1,
            letterSpacing: "-1px",
          }}
        >
          S
        </div>
      </div>
    ),
    {
      width: 32,
      height: 32,
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}
