// Server-side proxy for all GraphQL requests to the Stash instance.
// The browser posts to /api/graphql, and this route forwards the request
// to the real Stash GraphQL endpoint with the API key added server-side,
// so credentials are never exposed in the client bundle.

import { NextRequest } from "next/server";

const STASH_INTERNAL_URL = process.env.STASH_INTERNAL_URL ?? "http://localhost:9999";
const STASH_API_KEY = process.env.STASH_API_KEY ?? "";

// Forwards incoming GraphQL POST requests to Stash and streams the response back.
export async function POST(req: NextRequest) {
  const body = await req.text();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (STASH_API_KEY) {
    headers["ApiKey"] = STASH_API_KEY;
  }

  const upstream = await fetch(`${STASH_INTERNAL_URL}/graphql`, {
    method: "POST",
    headers,
    body,
  });

  const data = await upstream.text();

  return new Response(data, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
