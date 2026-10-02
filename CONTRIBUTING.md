# Contributing

PRs are welcome. This doc covers everything you need to get up and running and the standards expected of contributions.

## Prerequisites

- Node.js 24+ (frontend)
- Python 3.12+ (backend)
- A running [Stash](https://github.com/stashapp/stash) instance to develop against

## Setup

A Python (FastAPI) backend under `backend/` and a Vite + React SPA under
`frontend/`. Run both; the Vite dev server proxies `/api` to the backend.

```bash
git clone https://github.com/aayusharyan/stash-hub.git
cd stash-hub
cp .env.example .env   # edit with your Stash URL and API key

# Terminal 1 - backend (FastAPI on :8000)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 - frontend (Vite dev server, proxies /api to :8000)
cd frontend
npm install
npm run dev
```

## Environment Variables

Read by the backend at runtime; browser-facing values reach the SPA via `/api/config`.

| Variable             | Required | Description                                                                                                  |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `STASH_INTERNAL_URL` | Yes      | URL the **backend** uses to reach Stash (GraphQL + media). Mirrored as `externalUrl` when EXTERNAL is unset. |
| `STASH_API_KEY`      | No       | Stash API key from **Settings → Security → API Key**. Server-side only.                                      |
| `STASH_EXTERNAL_URL` | No       | Browser URL for "Open Stash" / edit links. Unset → INTERNAL; empty → hide controls.                          |
| `PAGE_SIZE`          | No       | Items per page across listing views (default: `60`)                                                          |
| `WEB_CONCURRENCY`    | No       | Number of Uvicorn backend workers (default: `2 × CPU cores`)                                                 |

These two Stash URLs are not interchangeable. The backend and the browser often
cannot reach Stash on the same hostname:

- **Locally** they can both be `http://localhost:9999` (omit EXTERNAL to reuse INTERNAL).
- **Docker on the same machine as Stash:** internal is `http://host.docker.internal:9999` (`localhost` inside the container is the container, not Stash); set external to `http://localhost:9999` (what you type in the browser).
- **Compose / private network:** internal is a Docker DNS name like `http://stash:9999`; set external to the LAN or public URL (`http://192.168.1.50:9999` or `https://stash.example.com`). The browser cannot resolve Compose service names.

Playback, search, and every API call use `STASH_INTERNAL_URL` only.
`STASH_EXTERNAL_URL` is solely for those "open / edit in Stash" links — omit it to
reuse INTERNAL, set it when the browser cannot reach that hostname, or set it empty
to hide the controls.

`STASH_API_KEY` never reaches the browser.

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

## Project Structure

```
backend/
  app/
    main.py         # FastAPI app factory + lifespan-managed httpx client
    config.py       # Settings (pydantic-settings)
    stash_client.py # Async GraphQL executor + query strings
    util.py         # Media URL rewriting (Stash origin -> /api/stash)
    routers/        # scenes, performers, studios, tags, search, stats, media, meta
  gunicorn_conf.py  # Uvicorn worker config
frontend/
  src/
    pages/          # One component per screen (Home, Scenes, Scene, ...)
    components/     # Shared UI (layout, scene, performer, studio, tag, ui)
    contexts/       # Theme, View, Config
    lib/            # api.ts (REST client), queries.ts (TanStack hooks), utils.ts
    App.tsx         # Router + layout
    main.tsx        # Entry point + providers
nginx/              # nginx.conf (static SPA + /api reverse proxy)
docker/             # Dockerfile, docker-compose.example.yaml, supervisord.conf
scripts/            # Maintainer-only tooling (not baked into the Docker image)
```

## Favicons

Committed under `frontend/public/favicons/` (plus `favicon.ico` for crawlers).
The SPA just picks the right file when the user changes theme/accent — no
regeneration needed for that.

Only re-run the generator if you edit the icon design or the accent colour
list in code (`pip install pillow` first; Pillow is not a runtime dependency):

```bash
python scripts/generate_favicons.py
```

`scripts/` is maintainer tooling and is not included in the Docker image.

## Architecture

nginx serves the SPA and reverse-proxies `/api/*` to the FastAPI backend. The
browser never contacts Stash directly.

```
Browser ─ /api/* ▶ nginx ─▶ FastAPI ─┬─ POST /graphql  ─▶ Stash
                                     └─ GET media+Range ▶ Stash
```

This keeps `STASH_INTERNAL_URL` and `STASH_API_KEY` off the client entirely.

## Code Standards

- **Types everywhere** - TypeScript on the frontend, Python type hints + Pydantic on the backend
- **No unused imports or variables** - clean up before opening a PR
- **Component files** - one component per file, named to match the export
- **Never leak secrets** - the API key and internal Stash URL must stay server-side; only `/api/stash/*` and `/api/config` values reach the browser
- **Tailwind over custom CSS** - reach for a utility class before writing new CSS

## Commit Messages

Use the conventional commits format:

```
feat: add performer filter by nationality
fix: scene card hover preview flicker on Safari
chore: bump vidstack to 1.15.6
```

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `style`, `perf`.

## Pull Requests

- Keep PRs focused - one feature or fix per PR
- Include a short description of what changed and why
- If you're changing UI, include a screenshot or screen recording
- PRs that break the build will not be merged

## Docker

Run the pre-built image:

```bash
docker run -d -p 7676:7676 \
  -e STASH_INTERNAL_URL=http://your-stash-host:9999 \
  -e STASH_API_KEY=your-api-key \
  --name stash-hub \
  ghcr.io/aayusharyan/stash-hub:latest
```

For Docker Compose, use [`docker/docker-compose.example.yaml`](docker/docker-compose.example.yaml).
See [docker/README.md](docker/README.md) for full options.

## License

By contributing you agree that your code will be released under the [MIT License](LICENSE).
