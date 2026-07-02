# Docker Setup

Run StashHub with Docker - no Node.js required.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/aayusharyan/stash-hub/main/docker/docker-compose.yml

# Set your Stash URL and (optionally) API key, then start
STASH_INTERNAL_URL=http://your-stash-host:9999 STASH_API_KEY=your-key docker compose up -d
```

Access at: http://localhost:7676

### Using Docker CLI

```bash
docker run -d \
  -p 7676:7676 \
  -e STASH_INTERNAL_URL=http://your-stash-host:9999 \
  -e STASH_API_KEY=your-api-key \
  --name stash-hub \
  ghcr.io/aayusharyan/stash-hub:latest
```

## Configuration

All configuration is done via environment variables. Create a `.env` file alongside your `docker-compose.yml`:

```env
# Required: URL of your Stash instance (no trailing slash)
STASH_INTERNAL_URL=http://your-stash-host:9999

# Optional: API key from Stash → Settings → Security → API Key
STASH_API_KEY=

# Optional: Browser-facing URL of your Stash instance. Used for the "Open Stash"
# footer link and edit links on scene, performer, and studio detail pages.
NEXT_PUBLIC_STASH_EXTERNAL_URL=http://your-stash-host:9999

# Optional: number of items per page (default: 60)
NEXT_PUBLIC_PAGE_SIZE=60

# Optional: port to expose StashHub on (default: 7676)
STASH_HUB_PORT=7676
```

Then run:

```bash
docker compose -f docker/docker-compose.yml up -d
```

### Variable Reference

| Variable                         | Description                                                                                                         | Default                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `STASH_INTERNAL_URL`             | Your Stash instance URL. Server-side only, never exposed to the browser.                                            | `http://localhost:9999` |
| `STASH_API_KEY`                  | Stash API key. Server-side only, never exposed to the browser.                                                      | _(empty)_               |
| `NEXT_PUBLIC_STASH_EXTERNAL_URL` | Browser-facing Stash URL. Powers the "Open Stash" footer link and edit links on scene, performer, and studio pages. | `http://localhost:9999` |
| `NEXT_PUBLIC_PAGE_SIZE`          | Number of items per page in listing views.                                                                          | `60`                    |
| `STASH_HUB_PORT`                 | Host port to expose StashHub on.                                                                                    | `7676`                  |

> **How `NEXT_PUBLIC_*` vars work at runtime:** The pre-built image uses placeholder strings in the compiled bundle. The container's `entrypoint.sh` replaces them with your actual env var values on every startup - no image rebuild needed.

## Updating

Pull the latest image and restart:

```bash
docker compose -f docker/docker-compose.yml pull
docker compose -f docker/docker-compose.yml up -d
```

## Stopping

```bash
docker compose -f docker/docker-compose.yml down
```

## Pinning a Version

Replace `latest` with a specific version tag to pin your deployment:

```yaml
image: ghcr.io/aayusharyan/stash-hub:v1.2.0
```

Available tags:

- `latest` - most recent release
- `vX.Y.Z` - exact version (e.g. `v1.2.0`)
- `vX.Y` - latest patch for a minor version (e.g. `v1.2`)
- `vX` - latest minor for a major version (e.g. `v1`)

## Building Locally

If you want to build from source:

```bash
git clone https://github.com/aayusharyan/stash-hub.git
cd stash-hub

# Edit build args as needed
docker compose up -d --build
```

The root `docker-compose.yml` builds from `docker/Dockerfile`. All `NEXT_PUBLIC_*` vars
are resolved at startup via `entrypoint.sh`, so no special build args are needed.

## Troubleshooting

### App shows "connection refused" or blank data

Check that `STASH_INTERNAL_URL` points to a reachable Stash instance from inside the container.
If Stash runs on the same machine, use `host.docker.internal` instead of `localhost`:

```env
STASH_INTERNAL_URL=http://host.docker.internal:9999
```

### Check logs

```bash
docker logs stash-hub
```

### Verify the container is healthy

```bash
docker inspect stash-hub --format='{{.State.Health.Status}}'
```

## Requirements

- Docker 20.10+
- Docker Compose v2+ (if using compose)
