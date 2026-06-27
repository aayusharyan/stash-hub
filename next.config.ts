// Next.js build and runtime configuration.
// - standalone output enables the minimal Docker image (no separate server).
// - transpilePackages fixes ESM/CJS interop issues with Apollo Client.
// - Permissive remotePatterns allow next/image to proxy from any Stash hostname.
// - allowedDevOrigins lets LAN machines access HMR dev resources (dev only).

import type { NextConfig } from "next";

// Allow any IPv4 address to access HMR WebSocket in dev.
// Next.js splits patterns by dot - "*.*.*.*" matches any 4-segment IPv4 address.
// A bare "*" is explicitly blocked by Next.js, so this is the simplest valid wildcard.
const allowedDevOrigins = ["*.*.*.*"];

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@apollo/client", "ts-invariant"],
  allowedDevOrigins,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [];
  },
};

export default nextConfig;
