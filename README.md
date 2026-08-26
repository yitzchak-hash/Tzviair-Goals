# TzviAir Goals

The shared goals board for the TzviAir team — a Hebrew-first (RTL, with an
English toggle) TV dashboard for starting, timing, and closing project goals,
synced across every computer through one shared cloud document.

**Production:** <https://tzviair-goals.vercel.app>

## What's in this repo

| Path | What it is |
| --- | --- |
| `site/` | The Next.js frontend. The entire board UI lives in `site/app/page.tsx`. |
| `site/app/widget/` | The embeddable goals widget (`/widget`) for the TzviAir Job Manager — see [WIDGET.md](WIDGET.md). |
| `site/public/widget.js` | Drop-in embed script that other sites use to mount the widget. |
| `api/goals.mjs` | The only server code: a Vercel Function that reads/writes the shared board as one private JSON blob in Vercel Blob storage. |
| `HANDOFF.md` | Complete developer handoff: architecture, storage schema, sync behavior, deployment, and known gaps. |
| `WIDGET.md` | How to embed the goals widget in the Job Manager board and dashboard. |

The board's data lives in Vercel Blob (`tzviair-goals/shared-state.json`),
not in this repository — deploying never touches the data.

## Develop

```bash
npm ci && npm --prefix site ci   # install (Node >= 22.13, production uses 24.x)
npx vercel dev                   # full app including /api/goals
npm --prefix site run dev        # frontend only
```

## Test and build

```bash
npm test                         # API validation tests
npm --prefix site run lint
npm --prefix site test           # site build + rendered-HTML and widget tests
npm --prefix site run vercel-build   # the production Next.js build
```

## Deploy

The Vercel project `tzviair-goals` is connected to this GitHub repository;
pushes to the default branch deploy to production. Build configuration is in
[vercel.json](vercel.json) (static export from `site/out` plus the root
`api/` function). Storage credentials come from the Vercel project's
connected Blob store — nothing secret is committed here.
