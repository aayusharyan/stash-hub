# StashHub

A sleek, modern frontend for [Stash](https://github.com/stashapp/stash) - the self-hosted media manager built for people who take their personal collection _very_ seriously.

If you know what Stash is, you already know exactly what this is for. If you don't, it's a polished custom UI layer that sits on top of your Stash instance and gives your private library the UI it deserves.

> Your collection. Your server. Your terms.

## Features

- **Scene Browser** - Paginated grid with hover previews, sorting, and filtering across your full library
- **Video Playback** - HLS streaming with scene markers, Cinema mode, and full keyboard shortcuts
- **Performers** - Browse your entire roster with detailed profiles, stats, and filters
- **Studios** - Everything organized by production house, exactly how you'd want it
- **Tags** - Dedicated tag listing and detail pages
- **Live Search** - Instant search across scenes, performers, studios, and tags simultaneously
- **Watch History** - Your viewing history, always one click away
- **Stats Dashboard** - At-a-glance totals for your full collection
- **Themes** - Light, dark, and system mode with 6 accent color options

## Quick Start

### Docker (recommended)

```bash
docker run -d -p 7676:7676 \
  -e STASH_INTERNAL_URL=http://your-stash-host:9999 \
  -e STASH_API_KEY=your-api-key \
  --name stash-hub \
  ghcr.io/aayusharyan/stash-hub:latest
```

Access at http://localhost:7676

Requires a running [Stash](https://github.com/stashapp/stash) instance and Docker.
See [docker/README.md](docker/README.md) for more options, including Docker Compose.

### Local Development

Needs Node.js 20+, Python 3.12+, and a running Stash instance. The repo has a
Python backend and a React SPA - run both in separate terminals; the frontend
dev server proxies `/api` to the backend.

```bash
git clone https://github.com/aayusharyan/stash-hub.git
cd stash-hub
cp .env.example .env   # edit with your Stash URL and API key

# Terminal 1 - backend (FastAPI on :8000)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 - frontend (Vite on :7676, proxies /api to :8000)
cd frontend
npm install
npm run dev
```

## Configuration

All configuration is via environment variables (see `.env.example`). The backend
reads them at startup and serves browser-facing values to the SPA through
`/api/config`.

| Variable             | Description                                                                                                       | Default                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `STASH_INTERNAL_URL` | URL the **backend** uses to reach Stash (GraphQL + media). Mirrored as `externalUrl` only when EXTERNAL is unset. | `http://localhost:9999` |
| `STASH_API_KEY`      | Stash API key from **Settings → Security → API Key** - server-side only                                           | _(empty)_               |
| `STASH_EXTERNAL_URL` | Browser URL for "Open Stash" / edit links. Unset → same as INTERNAL; empty → hide those controls.                 | _(unset → INTERNAL)_    |
| `PAGE_SIZE`          | Items per page across all listing views                                                                           | `60`                    |
| `WEB_CONCURRENCY`    | Number of Uvicorn backend workers                                                                                 | `2 × CPU cores`         |
| `STASH_HUB_PORT`     | Host port the container is published on                                                                           | `7676`                  |

These two Stash URLs are not interchangeable. The backend and the browser often
cannot reach Stash on the same hostname:

- **Locally** they can both be `http://localhost:9999` (omit EXTERNAL to reuse INTERNAL).
- **Docker on the same machine as Stash:** internal is `http://host.docker.internal:9999` (`localhost` inside the container is the container, not Stash); set external to `http://localhost:9999` (what you type in the browser).
- **Compose / private network:** internal is a Docker DNS name like `http://stash:9999`; set external to the LAN or public URL (`http://192.168.1.50:9999` or `https://stash.example.com`). The browser cannot resolve Compose service names.

Playback, search, and every API call use `STASH_INTERNAL_URL` only.
`STASH_EXTERNAL_URL` is solely for those "open / edit in Stash" links — omit it to
reuse INTERNAL, set it when the browser cannot reach that hostname, or set it empty
to hide the controls.

`STASH_API_KEY` never leaves the backend. Only `/api/stash/*` media URLs and the
resolved `externalUrl` / `pageSize` from `/api/config` are exposed to the client.

## Architecture

A decoupled stack: nginx serves the compiled React SPA and reverse-proxies `/api/*`
to an async Python (FastAPI) backend. The backend wraps Stash's GraphQL behind a
typed REST API and streams media in parallel. Your browser never talks to Stash
directly, and the API key stays on the server.

```
Browser ─ static SPA ──────────▶ nginx :7676
Browser ─ /api/* (REST + media) ▶ nginx ─▶ FastAPI :8000 ─┬─ POST /graphql  ─▶ Stash
                                                          └─ GET media+Range ▶ Stash
```

The media proxy uses a shared `httpx.AsyncClient` and streams with byte-range
support, so many concurrent video/preview streams run in parallel across the async
event loop and multiple gunicorn/Uvicorn workers.

## Tech Stack

| Layer         | Tech                                          |
| ------------- | --------------------------------------------- |
| Backend       | FastAPI + gunicorn/Uvicorn (async Python)     |
| Upstream I/O  | httpx (async GraphQL + streaming media proxy) |
| Frontend      | Vite + React 19 + React Router v7             |
| Data fetching | TanStack Query v5 over a typed REST client    |
| Video player  | Vidstack (HLS + VTT previews)                 |
| Styling       | Tailwind CSS 4 + shadcn/ui                    |
| Serving       | nginx (static SPA + reverse proxy)            |

## Deployment

The app ships as a single Docker image from `docker/Dockerfile` (nginx + gunicorn
under supervisord). Releases go to
[GitHub Container Registry](https://ghcr.io/aayusharyan/stash-hub).

```bash
docker run -d -p 7676:7676 \
  -e STASH_INTERNAL_URL=http://your-stash-host:9999 \
  -e STASH_API_KEY=your-api-key \
  --name stash-hub \
  ghcr.io/aayusharyan/stash-hub:latest
```

Any platform that runs Docker containers works. Configure via environment
variables at container start. For Docker Compose, use
[`docker/docker-compose.example.yaml`](docker/docker-compose.example.yaml).

## Contributing

PRs welcome. If you're a Stash user, you know the drill - and you know exactly what kind of collection this is built to manage.

## License

MIT
