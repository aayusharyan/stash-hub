// Server-side proxy for all Stash media requests (images, video streams, VTT, previews).
// The browser fetches /api/stash/<anything>, and this route forwards it to the real
// Stash instance with the API key added, so the Stash origin is never contacted directly
// from the client. Range headers are forwarded to support video seeking.
//
// VTT files get special treatment: sprite image URLs inside them point back to the
// Stash origin, so we rewrite those URLs to go through this proxy before returning
// the file - otherwise the browser would try to fetch thumbnails directly from Stash
// and fail (no API key, different origin).

import { NextRequest } from "next/server";

const STASH_INTERNAL_URL = process.env.STASH_INTERNAL_URL ?? "http://localhost:9999";
const STASH_API_KEY = process.env.STASH_API_KEY ?? "";

// Returns true when the response looks like a WebVTT thumbnail file.
function isVttResponse(upstream: Response, pathSegments: string[]): boolean {
  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (contentType.includes("text/vtt")) return true;
  // Stash sometimes serves VTT with a generic content-type, so also match by path.
  const lastSegment = pathSegments[pathSegments.length - 1] ?? "";
  return lastSegment === "vtt" || lastSegment.endsWith(".vtt");
}

// Rewrites sprite image URLs inside a VTT body so every image is fetched via this
// proxy. Handles two cases:
//   1. Absolute Stash origin URLs  (http://stash-host/scene/hash_sprite.jpg#xywh=...)
//      → replace the origin with /api/stash
//   2. Relative filenames           (hash_sprite.jpg#xywh=...)
//      → prepend the proxy directory of the VTT file (e.g. /api/stash/scene/)
//      Relative URLs must be resolved against the VTT URL, not the page URL.
//      Vidstack resolves them against the page URL, so we make them absolute here.
function rewriteVttUrls(vttText: string, vttProxyBase: string): string {
  // Replace absolute Stash origin with the proxy prefix.
  const escapedOrigin = STASH_INTERNAL_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const absoluteRe = new RegExp(escapedOrigin, "g");
  let result = vttText.replace(absoluteRe, "/api/stash");

  // Convert remaining relative image URLs (no scheme, no leading slash) to
  // absolute proxy paths so the browser fetches them through /api/stash/*.
  // Match lines that contain an image extension but don't already start with
  // a scheme (http/https) or a slash - timestamps and VTT keywords are safe
  // because they don't contain image extensions.
  result = result.replace(
    /^((?!https?:|\/)[^\n]*\.(jpg|jpeg|png|webp|gif)[^\n]*)$/gim,
    (line) => vttProxyBase + line,
  );

  return result;
}

// Proxies GET requests (images, video streams, VTT sprite files, previews).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const { search } = new URL(req.url);
  const targetUrl = `${STASH_INTERNAL_URL}/${path.join("/")}${search}`;

  const upstreamHeaders: HeadersInit = {};

  if (STASH_API_KEY) {
    upstreamHeaders["ApiKey"] = STASH_API_KEY;
  }

  // Forward Range header so the browser can seek inside video streams.
  const range = req.headers.get("range");
  if (range) {
    upstreamHeaders["Range"] = range;
  }

  const upstream = await fetch(targetUrl, { headers: upstreamHeaders });

  // Pass back only the headers the client needs to handle the response correctly.
  const responseHeaders = new Headers();
  const forward = [
    "Content-Type",
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
    "Cache-Control",
  ];
  for (const h of forward) {
    const val = upstream.headers.get(h);
    if (val) responseHeaders.set(h, val);
  }

  // For VTT files, rewrite sprite URLs so the browser fetches them via this proxy.
  // vttProxyBase is the proxy directory of the VTT (e.g. /api/stash/scene/) so
  // relative sprite filenames resolve correctly regardless of the page URL.
  if (isVttResponse(upstream, path)) {
    const originalText = await upstream.text();
    const vttDir = path.slice(0, -1).join("/");
    const vttProxyBase = `/api/stash/${vttDir}/`;
    const rewrittenText = rewriteVttUrls(originalText, vttProxyBase);
    responseHeaders.delete("Content-Length");
    return new Response(rewrittenText, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
