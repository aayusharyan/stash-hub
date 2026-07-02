# StashHub

A sleek, modern frontend for [Stash](https://github.com/stashapp/stash) - the self-hosted media manager built for people who take their personal collection _very_ seriously.

If you know what Stash is, you already know exactly what this is for. If you don't, it's a polished custom UI layer that sits on top of your Stash instance and gives your private library the dashboard it deserves.

> Your collection. Your server. Your terms.

## Features

- **Scene Browser** - Paginated grid with hover previews, sorting, and filtering across your full library
- **Video Playback** - HLS streaming with scene markers, Cinema mode, and full keyboard shortcuts
- **Performers** - Browse your entire roster with detailed profiles, stats, and filters
- **Studios** - Everything organized by production house, exactly how you'd want it
- **Tags** - Hierarchical tag browser with dedicated listing pages
- **Live Search** - Instant search across scenes, performers, studios, and tags simultaneously
- **Watch History** - Your viewing history, always one click away
- **Stats Dashboard** - At-a-glance totals for your full collection
- **Themes** - Light, dark, and system mode with 6 accent color options

## Quick Start

### Prerequisites

- A running [Stash](https://github.com/stashapp/stash) instance
- Docker (for running the app)
- Node.js 18+ (only for local development)

### Docker (recommended)

```bash
docker run -d -p 7676:7676 \
  -e STASH_INTERNAL_URL=http://your-stash-host:9999 \
  -e STASH_API_KEY=your-api-key \
  --name stash-hub \
  ghcr.io/aayusharyan/stash-hub:latest
```

Access at http://localhost:7676

See [docker/README.md](docker/README.md) for more options including Docker Compose.

### Local Development

```bash
git clone https://github.com/aayusharyan/stash-hub.git
cd stash-hub

npm install
cp .env.example .env.local
# Edit .env.local with your Stash URL and API key

npm run dev
```

## Configuration

Copy `.env.example` to `.env.local` and fill in the values:

| Variable                         | Description                                                                                                           | Default                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `STASH_INTERNAL_URL`             | Your Stash instance URL - server-side only, never sent to the browser                                                 | `http://localhost:9999` |
| `STASH_API_KEY`                  | Stash API key from **Settings → Security → API Key**                                                                  | _(empty)_               |
| `NEXT_PUBLIC_STASH_EXTERNAL_URL` | Browser-facing Stash URL - used for the "Open Stash" footer link and edit links on scene, performer, and studio pages | `http://localhost:9999` |
| `NEXT_PUBLIC_PAGE_SIZE`          | Items per page across all listing views                                                                               | `60`                    |

`STASH_INTERNAL_URL` and `STASH_API_KEY` are server-side proxy variables only - they are never included in the client bundle.

## Architecture

All requests go through StashHub's server - your browser never talks to Stash directly. Your Stash URL and API key stay on the server and are never exposed to the client.

```
Browser  →  /api/graphql   →  Stash GraphQL API
         →  /api/stash/*   →  Stash media (images, streams, previews)
```

## Tech Stack

| Layer         | Tech                          |
| ------------- | ----------------------------- |
| Framework     | Next.js 16 + React 19         |
| Data fetching | Apollo Client 4 (GraphQL)     |
| Video player  | Vidstack (HLS + VTT previews) |
| Styling       | Tailwind CSS 4 + shadcn/ui    |
| State         | Zustand                       |
| Language      | TypeScript throughout         |

## Deployment

The app ships as a Docker image built from `docker/Dockerfile` using a multi-stage build with `output: "standalone"` for a minimal image size. Releases are published automatically to [GitHub Container Registry](https://ghcr.io/aayusharyan/stash-hub) via the release workflow.

```bash
docker compose -f docker/docker-compose.yml up -d
```

For cloud deployments, any platform that runs Docker containers works. `NEXT_PUBLIC_*` variables must be set at **build time** (baked into the pre-built image with sensible defaults); `STASH_INTERNAL_URL` and `STASH_API_KEY` are injected at **runtime**.

## Contributing

PRs welcome. If you're a Stash user, you know the drill - and you know exactly what kind of collection this is built to manage.

## License

MIT
