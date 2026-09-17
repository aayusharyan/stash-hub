# Agent notes

This is a FastAPI + Vite/React SPA. Routes live under `frontend/src/` with
React Router. Fetch only through `frontend/src/lib/api.ts` and the hooks in
`queries.ts`. Do not call Stash GraphQL from the browser or put secrets in
the Vite bundle.

## Architecture

nginx serves the compiled SPA and reverse-proxies `/api/*` to FastAPI. FastAPI
wraps Stash GraphQL behind a typed REST API and streams media. The browser never
talks to Stash. `STASH_INTERNAL_URL` and `STASH_API_KEY` stay server-side.

```
Browser ─ SPA ──────────▶ nginx :7676
Browser ─ /api/* ───────▶ nginx ─▶ FastAPI :8000 ─┬─ POST /graphql ─▶ Stash
                                                  └─ GET media+Range ▶ Stash
```

Locally, Vite (`frontend/`, port 7676) proxies `/api` to uvicorn (`backend/`,
port 8000). Runtime config for the SPA comes from `GET /api/config`, not
build-time env.

## Layout

```
backend/app/          FastAPI app, stash_client, media proxy, routers
backend/app/routers/  scenes, performers, studios, tags, search, stats, media, meta
frontend/src/pages/   one component per screen
frontend/src/lib/     api.ts (REST), queries.ts (TanStack Query hooks)
frontend/src/App.tsx  React Router routes
nginx/nginx.conf      static SPA + /api reverse proxy
docker/               Dockerfile, docker-compose.example.yaml, supervisord
```

## Conventions

- Frontend: TypeScript, one component per file, `@/` alias, Tailwind before
  custom CSS. Fetch only through `frontend/src/lib/api.ts` and the hooks in
  `queries.ts`. Do not call Stash GraphQL from the client.
- Backend: Python type hints + Pydantic. Routers live under `/api`. Rewrite
  Stash media URLs with `proxy_media_urls` / `to_proxy_url` before returning
  JSON so the client only sees `/api/stash/...`.
- Media proxy (`routers/media.py`) must stream with Range support, close
  abandoned upstreams, and keep HTTP/1.1 pooling (do not switch the shared
  httpx client to HTTP/2).
- Never leak `STASH_INTERNAL_URL` or `STASH_API_KEY` to the browser or into
  the Vite bundle.
- Version lives in `frontend/package.json`, `backend/pyproject.toml`, and the
  `LABEL version` in `docker/Dockerfile`. The release workflow bumps all three.
- File-top comments describe what the file does; function comments go above
  the function. No section-divider banners. Skip comments on obvious
  declarations.
