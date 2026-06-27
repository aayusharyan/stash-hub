#!/bin/sh
# Runs once at container startup before the Next.js server launches.
# Replaces placeholder strings baked into the compiled JS/JSON bundle with the
# actual env var values passed by the user, making the pre-built image reusable
# across any deployment target without requiring a rebuild.

set -e

# Default fallback values mirror the ARG defaults in the Dockerfile.
STASH_EXTERNAL_URL="${NEXT_PUBLIC_STASH_EXTERNAL_URL:-http://localhost:9999}"
PAGE_SIZE="${NEXT_PUBLIC_PAGE_SIZE:-60}"

# Scope the replacement to .next/static (client-side bundles only) for speed.
# Using | as sed delimiter avoids conflicts with forward slashes in URLs.
find .next/static -type f \( -name "*.js" -o -name "*.json" \) \
  -exec sed -i "s|__NEXT_PUBLIC_STASH_EXTERNAL_URL__|${STASH_EXTERNAL_URL}|g" {} +

find .next/static -type f \( -name "*.js" -o -name "*.json" \) \
  -exec sed -i "s|__NEXT_PUBLIC_PAGE_SIZE__|${PAGE_SIZE}|g" {} +

exec node server.js
