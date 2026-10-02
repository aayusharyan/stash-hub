# Docker Setup

Run StashHub with Docker.

## Quick Start

```bash
docker run -d \
  -p 7676:7676 \
  -e STASH_INTERNAL_URL=http://your-stash-host:9999 \
  -e STASH_API_KEY=your-api-key \
  --name stash-hub \
  ghcr.io/aayusharyan/stash-hub:latest
```

Access at: http://localhost:7676

## Docker Compose

Download [`docker-compose.example.yaml`](docker-compose.example.yaml), save it as
`docker-compose.yml`, then start it:

```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/aayusharyan/stash-hub/main/docker/docker-compose.example.yaml

# Set your Stash URL and (optionally) API key, then start
STASH_INTERNAL_URL=http://your-stash-host:9999 STASH_API_KEY=your-key docker compose up -d
```

## Configuration

All configuration is done via environment variables. Create a `.env` file alongside your `docker-compose.yml`:

```env
# Required: URL of your Stash instance (no trailing slash)
STASH_INTERNAL_URL=http://your-stash-host:9999

# Optional: API key from Stash → Settings → Security → API Key
STASH_API_KEY=

# Optional: browser-facing Stash URL for "Open Stash" / edit links.
# Omit to reuse STASH_INTERNAL_URL. Set empty to hide those controls.
# Set when the browser cannot reach the INTERNAL hostname.
# STASH_EXTERNAL_URL=http://your-stash-host:9999

# Optional: number of items per page (default: 60)
PAGE_SIZE=60

# Optional: port to expose StashHub on (default: 7676)
STASH_HUB_PORT=7676

# Optional: number of backend workers (default: 2x CPU cores)
WEB_CONCURRENCY=
```

Then run:

```bash
docker compose up -d
```

### Variable Reference

| Variable             | Description                                                                                              | Default                 |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------- |
| `STASH_INTERNAL_URL` | URL the backend uses to reach Stash (GraphQL + media). Mirrored as `externalUrl` when EXTERNAL is unset. | `http://localhost:9999` |
| `STASH_API_KEY`      | Stash API key. Server-side only, never exposed to the browser.                                           | _(empty)_               |
| `STASH_EXTERNAL_URL` | Browser URL for "Open Stash" / edit links. Unset → INTERNAL; empty → hide those controls.                | _(unset → INTERNAL)_    |
| `PAGE_SIZE`          | Number of items per page in listing views.                                                               | `60`                    |
| `WEB_CONCURRENCY`    | Number of Uvicorn backend workers.                                                                       | `2 × CPU cores`         |
| `STASH_HUB_PORT`     | Host port to expose StashHub on.                                                                         | `7676`                  |

> **How runtime config works:** all variables are read by the backend at container
> startup. Browser-facing values (resolved `externalUrl`, `PAGE_SIZE`) are served to
> the SPA via `/api/config`.

## Updating

```bash
docker pull ghcr.io/aayusharyan/stash-hub:latest
docker stop stash-hub && docker rm stash-hub
```

Then re-run the `docker run` command from Quick Start. If you use Docker Compose:

```bash
docker compose pull
docker compose up -d
```

## Stopping

```bash
docker stop stash-hub && docker rm stash-hub
```

Or, if you use Docker Compose:

```bash
docker compose down
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

docker build -f docker/Dockerfile -t stash-hub .
docker run -d -p 7676:7676 \
  -e STASH_INTERNAL_URL=http://your-stash-host:9999 \
  -e STASH_API_KEY=your-api-key \
  --name stash-hub \
  stash-hub
```

The image is built from `docker/Dockerfile` and serves the SPA via nginx +
gunicorn. Configuration comes from environment variables at container start.

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
- Docker Compose v2+ (only if you use Docker Compose)
