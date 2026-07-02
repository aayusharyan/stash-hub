# Contributing

PRs are welcome. This doc covers everything you need to get up and running and the standards expected of contributions.

## Prerequisites

- Node.js 18+
- A running [Stash](https://github.com/stashapp/stash) instance to develop against

## Setup

```bash
git clone https://github.com/aayusharyan/stash-hub.git
cd stash-hub
npm install
cp .env.example .env.local
# Edit .env.local with your Stash URL and API key
npm run dev
```

App runs at http://localhost:7676.

## Environment Variables

| Variable                         | Required | Description                                                                                                         |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `STASH_INTERNAL_URL`             | Yes      | Server-side proxy target - your Stash instance URL                                                                  |
| `STASH_API_KEY`                  | No       | Stash API key from **Settings → Security → API Key**                                                                |
| `NEXT_PUBLIC_STASH_EXTERNAL_URL` | No       | Browser-facing Stash URL - powers the "Open Stash" footer link and edit links on scene, performer, and studio pages |
| `NEXT_PUBLIC_PAGE_SIZE`          | No       | Items per page across listing views (default: `60`)                                                                 |

`STASH_INTERNAL_URL` and `STASH_API_KEY` are server-side only - they are never included in the client bundle.

## Tech Stack

| Layer         | Tech                          |
| ------------- | ----------------------------- |
| Framework     | Next.js 16 + React 19         |
| Data fetching | Apollo Client 4 (GraphQL)     |
| Video player  | Vidstack (HLS + VTT previews) |
| Styling       | Tailwind CSS 4 + shadcn/ui    |
| State         | Zustand                       |
| Language      | TypeScript throughout         |

## Project Structure

```
src/
  app/
    api/          # Server-side proxy routes (GraphQL, media)
    scenes/       # Scene browser and playback
    performers/   # Performer listing and profiles
    studios/      # Studio listing and pages
    tags/         # Tag browser
    search/       # Live search
    history/      # Watch history
    layout.tsx    # Root layout, theme, and nav
    page.tsx      # Stats dashboard (home)
  components/     # Shared UI components
docker/           # Dockerfile and end-user Docker Compose
```

## Architecture

All requests proxy through the Next.js server. The browser never contacts Stash directly.

```
Browser  →  /api/graphql   →  Stash GraphQL API
         →  /api/stash/*   →  Stash media (images, streams, previews)
```

This keeps `STASH_INTERNAL_URL` and `STASH_API_KEY` off the client entirely.

## Code Standards

- **TypeScript everywhere** - no `any` unless genuinely unavoidable
- **No unused imports or variables** - clean up before opening a PR
- **Component files** - one component per file, named to match the export
- **`NEXT_PUBLIC_*` vars** - these are baked into the client bundle at build time; only use them for values that are safe to expose publicly
- **Server vs. client components** - prefer React Server Components; add `"use client"` only when you need interactivity or browser APIs
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

## Docker (end users, not for development)

End users run the pre-built image - no source required:

```bash
docker compose -f docker/docker-compose.yml up -d
```

See [docker/README.md](docker/README.md) for full options.

## License

By contributing you agree that your code will be released under the [MIT License](LICENSE).
