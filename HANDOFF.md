# TzviAir Goals — complete developer handoff

Export date: 2026-08-26  
Production project: `tzviair-goals`  
Production URL: <https://tzviair-goals.vercel.app>

This archive contains the complete source/configuration snapshot used for the
TzviAir goals app, plus the four font files preloaded by the live deployment.
It intentionally does not contain credentials, current business data, Git
history, dependency folders, caches, logs, or generated build output.

## 1. Project shape and full file inventory

The Vercel project root is the root of this archive. The frontend lives in
`site/`; the Vercel Function lives in root-level `api/`.

```text
.
|-- .env.example                         # handoff-only, names and empty values
|-- .gitignore
|-- .vercelignore
|-- HANDOFF.md                           # handoff-only documentation
|-- FILE-MANIFEST.sha256                 # generated after this document
|-- package.json
|-- package-lock.json
|-- vercel.json
|-- api/
|   |-- goals.mjs                        # production GET/POST API
|   `-- goals.test.mjs
|-- .vercel/
|   |-- project.json                     # project/team link and Node setting
|   `-- README.txt
|-- deployment-assets/
|   `-- fonts/                           # exact four live preloaded WOFF2 files
|       |-- 1c9ef42b327f16c7-s.p.05.1ccstyjr3y.woff2
|       |-- 86c8c58929c52757-s.p.0.9xmnne063hw.woff2
|       |-- 87c7f5b5afcd23bd-s.p.06avho5za9mi..woff2
|       `-- c9f6ebf08ddd616b-s.p.08ydm43xlmlw2.woff2
`-- site/
    |-- .gitignore
    |-- .openai/
    |   `-- hosting.json                 # unused Sites scaffold metadata
    |-- README.md                        # original Vinext starter README
    |-- package.json
    |-- package-lock.json
    |-- next-env.d.ts
    |-- next.config.ts
    |-- tsconfig.json
    |-- postcss.config.mjs
    |-- eslint.config.mjs
    |-- vite.config.ts
    |-- drizzle.config.ts
    |-- app/
    |   |-- page.tsx                     # entire product UI and client logic
    |   |-- layout.tsx                   # metadata and next/font setup
    |   |-- globals.css                  # complete responsive theme
    |   `-- chatgpt-auth.ts              # unused starter helper
    |-- build/
    |   `-- sites-vite-plugin.ts         # unused by Vercel production build
    |-- db/
    |   |-- index.ts                     # unused D1 starter helper
    |   `-- schema.ts                    # intentionally empty
    |-- drizzle/
    |   `-- meta/
    |       `-- _journal.json
    |-- examples/
    |   `-- d1/
    |       |-- app/api/notes/route.ts
    |       `-- db/schema.ts
    |-- public/
    |   |-- favicon.svg                  # 718 bytes
    |   |-- file.svg                     # 391 bytes; unused starter asset
    |   |-- globe.svg                    # 1,035 bytes; unused starter asset
    |   |-- og.png                       # 1,412,570 bytes; social card
    |   |-- tzviair-logo.png             # 358,741 bytes; app logo/icon
    |   `-- window.svg                   # 385 bytes; unused starter asset
    |-- tests/
    |   `-- rendered-html.test.mjs
    `-- worker/
        `-- index.ts                     # Vinext/Cloudflare starter path, unused on Vercel
```

There is no `app/api/goals/route.ts`, `lib/storage.ts`, or separate
`components/GoalCard.tsx`. The implementation is intentionally monolithic:
the UI is `site/app/page.tsx`, and the API/storage implementation is
`api/goals.mjs`.

### Excluded on purpose

- `.env.local` and `.vercel/.env.production.local`: credential-bearing files.
- `node_modules/` and `site/node_modules/`: restored exactly by the lockfiles.
- `.next/`, `out/`, `dist/`, `.vercel/output/`: generated build artifacts.
- `.git/` and `site/.git/`: repository history/metadata, not application source.
- `.npm-cache/`, `.wrangler/`, `work/`, and `*.log`: local caches and logs.
- `WorkLog/`: a separate Windows desktop product, not this goals app.
- The current live Blob JSON: this archive documents its schema/path but does
  not copy business data or create a file that could accidentally overwrite it.

## 2. Install, run, test, and build

The linked Vercel project is configured for Node.js `24.x`. Both package files
declare `node >=22.13.0`. Use Node 24 LTS/current 24.x for the closest match.

From the archive root:

```powershell
npm ci
npm --prefix site ci
```

For the complete app including `/api/goals`, use Vercel local development from
the archive root after linking/configuring the project:

```powershell
npx vercel dev
```

Frontend-only Vinext development is available from `site/`:

```powershell
npm run dev
```

Checks used by the project:

```powershell
npm test
npm run build
npm --prefix site run lint
npm --prefix site run build
node --test site/tests/rendered-html.test.mjs
```

`npm run build` at the root runs `next build` through the site's
`vercel-build` script. `npm --prefix site run build` is the separate Vinext
build used by the original Sites scaffold and rendered-HTML test.

## 3. Storage — exact Vercel Blob implementation

### Package and topology

- Package: `@vercel/blob` `^2.6.1` in the root `package.json`.
- The code imports `get`, `put`, and `del` from `@vercel/blob`.
- Production uses one private JSON blob for the entire board, not one blob per
  goal.
- Production pathname: `tzviair-goals/shared-state.json`.
- Preview test pathname: `tzviair-goals/preview-test-state.json`.
- Both are read/written with `access: "private"`.
- Writes use `addRandomSuffix: false`, `allowOverwrite: true`, and
  `contentType: "application/json"`, so the same pathname is overwritten.
- The API response disables caching with
  `private, no-cache, no-store, max-age=0, must-revalidate`.

The complete API is `api/goals.mjs` in this archive. It is the only production
server code that reads or writes Blob. There are no server actions.

### API behavior

- `GET /api/goals`: reads the selected JSON blob. If it does not exist, returns
  `{ "version": 1, "goals": null, "updatedAt": 0 }`.
- `POST /api/goals`: accepts `{ goals: Goal[] }`, validates every goal, creates
  a document with server-side `updatedAt: Date.now()`, and overwrites the whole
  blob.
- `DELETE /api/goals`: permitted only when `VERCEL_ENV === "preview"` and the
  request header `x-tzviair-test-board: 1` is present. It deletes only the
  preview-test blob.
- Production allows `GET` and `POST`; any other method returns 405.
- Limits: at most 200 goals, ID length 1–160, title length 1–160, finite
  nonnegative timestamps/durations.

The client adds `x-tzviair-test-board: 1` only when the page query string is
`?cloud-test=1`. On production that header does not switch storage because the
server also requires `VERCEL_ENV === "preview"`.

### localStorage and cloud source of truth

Keys:

- `tzviair-project-goals-v2`: device-local backup of the complete `Goal[]`.
- `tzviair-project-goals`: legacy boolean-array format used only for migration.
- `tzviair-goals-language`: device-local `"he"` or `"en"` preference.

Once the cloud document exists, Vercel Blob is the source of truth. Browser
storage is a fast local fallback/backup and a one-time migration source; it is
not merged with an existing cloud document.

First-load sequence:

1. React starts with the seven hardcoded initial goals.
2. During hydration, the client restores the language preference.
3. It tries the v2 local key. If the value is a valid `Goal[]`, it displays it
   immediately and marks that local data exists.
4. Otherwise it tries the legacy key. A valid legacy value must be a boolean
   array with exactly seven entries. It creates the seven current goal objects,
   marking the corresponding entries completed.
5. Cloud sync begins after hydration.
6. If Blob contains `goals`, that whole cloud array replaces the local array;
   the v2 local key is then refreshed automatically.
7. If Blob has `goals: null` and valid local data existed, the client uploads
   that local array once to initialize the cloud document.
8. If both cloud and local storage are empty, the hardcoded initial goals stay
   visible. They are first persisted to Blob when a user changes the board.

Ongoing sync:

- Poll every 5,000 ms.
- Also poll when the window gains focus and when the document becomes visible.
- Every local action updates React state and localStorage, queues the complete
  `Goal[]`, and POSTs the complete array.
- Local writes are serialized. If another local action happens while a write is
  in progress, the loop sends the newest queued array after the current write.
- While a local write is pending, the poll tries to flush it before reading.
- Cloud reads are applied only when their `updatedAt` is greater than the last
  server timestamp seen by that browser.
- On a failed write/read the UI shows offline status. Pending writes are retried
  by the next five-second synchronization pass.

Conflict behavior is last whole-document write wins. There is no ETag,
compare-and-swap, per-goal merge, transaction, revision precondition, or user
identity. Two computers editing at nearly the same time can overwrite one
another's changes; whichever POST reaches Blob last becomes authoritative.

## 4. Environment variables

No environment-variable values are included.

Application credential choices:

- `BLOB_READ_WRITE_TOKEN`: the simplest/standard server credential. Use this
  for local development or a non-OIDC deployment. Connecting a Blob store in
  Vercel normally provisions it for the project.
- `VERCEL_OIDC_TOKEN` plus `BLOB_STORE_ID`: alternative OIDC authentication
  supported by the installed `@vercel/blob` version. Both are needed together
  when explicitly using OIDC/store-ID authentication.

Platform variables read by application/build code:

- `VERCEL_ENV`: supplied automatically by Vercel; used only to isolate preview
  test data and enable preview-test deletion.
- `VERCEL`: supplied automatically by Vercel; `site/next.config.ts` uses it to
  set `output = "export"` during Vercel builds.

There are no `NEXT_PUBLIC_*` variables and no client-visible secrets. The local
credential file present at export time used the name `VERCEL_OIDC_TOKEN`; its
value is deliberately excluded. A developer moving the app to another Vercel
project should connect a Blob store and use the credential mode that project
provisions, rather than copying an old token.

## 5. Data model

The exact client types in `site/app/page.tsx` are:

```ts
type GoalStatus = "not-started" | "in-progress" | "completed";

type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  startedAt: number | null;
  elapsedMs: number;
  completedAt: number | null;
  targetMs?: number | null;
};

type CloudState = {
  version: number;
  goals: Goal[] | null;
  updatedAt: number;
};
```

Field meanings:

- `id`: stable client-generated string. Built-ins use
  `tzviair-goal-1` through `tzviair-goal-7`; added goals prefer
  `crypto.randomUUID()` and fall back to `goal-${Date.now()}`.
- `title`: stored display title. The UI limits input to 120 characters; the API
  permits 160.
- `status`: exactly `not-started`, `in-progress`, or `completed`.
- `startedAt`: client Unix epoch milliseconds for the current running segment,
  otherwise `null`.
- `elapsedMs`: accumulated finished-segment time in milliseconds.
- `completedAt`: client Unix epoch milliseconds when completed, otherwise
  `null`.
- `targetMs`: optional target duration in milliseconds. Missing and `null` both
  mean no target. A value must be finite and nonnegative.
- `version`: stored document version. It is currently always `1`.
- `goals`: the complete ordered board, or `null` before initialization.
- `updatedAt`: server timestamp assigned by the API to every successful POST.

### Versions and migrations

The `v2` in `tzviair-project-goals-v2` names the browser-storage format; it is
not the Blob document version. The old `tzviair-project-goals` value was a
seven-entry boolean array. Migration converts each boolean into a full goal:
`true` becomes `completed`, `false` becomes `not-started`; timers are zero and
completion timestamps are null.

The Blob document remains version 1. `targetMs` was added as an optional field,
so old browser and cloud goals without it remain valid. There is no destructive
v1-to-v2 Blob migration.

## 6. Timer logic

Running display time is computed exactly as:

```ts
goal.elapsedMs + Math.max(0, now - goal.startedAt)
```

That second term is added only when `status === "in-progress"` and
`startedAt` is non-null. Otherwise the display is `elapsedMs`.

- Start: only a `not-started` goal can start. It becomes `in-progress` and
  `startedAt` becomes the client's current `Date.now()`. `elapsedMs` is kept.
- Stop/pause: there is no separate stop or pause action/status in this version.
- Finish/complete: only an `in-progress` goal can finish. The active segment
  `finishedAt - startedAt` is added to `elapsedMs`; status becomes `completed`,
  `startedAt` becomes null, and `completedAt` becomes `finishedAt`.
- Reopen: a completed goal becomes `in-progress`, receives a new `startedAt`,
  clears `completedAt`, and keeps accumulated `elapsedMs`.
- Reset: any goal becomes `not-started`; `startedAt`, `elapsedMs`, and
  `completedAt` are reset to null/zero. `title` and `targetMs` remain.

Client timers/intervals:

- A one-second interval updates React's `now` value only while at least one goal
  is in progress. It does not POST every second; persistence relies on
  `startedAt`, so refresh/sleep does not lose running time as long as clocks are
  correct.
- A 5-second interval handles cloud synchronization.
- Fireworks/celebration state is cleared after 2,400 ms.

Target display uses `targetMs - elapsed`. A nonnegative result is shown as
remaining; a negative result is shown as over target. Zero target input is
stored as `null`.

## 7. Theme, fonts, and languages

Root CSS tokens in `site/app/globals.css`:

```css
:root {
  --navy: #123f82;
  --navy-deep: #082b66;
  --cyan: #00bce7;
  --cyan-dark: #069acb;
  --gold: #ffb600;
  --orange: #ff7900;
  --ink: #102c56;
  --muted: #667890;
  --surface: #ffffff;
  --background: #edf9fd;
  --border: #cfe6ef;
}
```

The stylesheet also uses derived alpha colors and gradients directly.

Fonts are loaded in `site/app/layout.tsx` with `next/font/google`:

- Heebo, Hebrew + Latin subsets, variable weights 100–900, CSS variable
  `--font-heebo`; primary body font.
- Rubik, Hebrew + Latin subsets, variable weights 300–900, CSS variable
  `--font-rubik`; headings, controls, metrics, and timers.
- Fallbacks are `Segoe UI`, Arial-derived Next.js fallbacks, and generic
  `sans-serif`/`monospace` as specified by the CSS.

The live HTML preloads exactly these four build-generated files, included under
`deployment-assets/fonts/`:

| File | Font/subset |
|---|---|
| `86c8c58929c52757-s.p.0.9xmnne063hw.woff2` | Heebo Hebrew |
| `1c9ef42b327f16c7-s.p.05.1ccstyjr3y.woff2` | Heebo Latin |
| `87c7f5b5afcd23bd-s.p.06avho5za9mi..woff2` | Rubik Hebrew |
| `c9f6ebf08ddd616b-s.p.08ydm43xlmlw2.woff2` | Rubik Latin |

These are not source files under `site/public`; Next.js generates hashed font
assets during `next build`. The four copies in this archive are deployment
references and are not imported by source. Their hashes/names may change after
a Next.js/font rebuild. Building currently requires network access to Google
Fonts unless the next developer converts the app to `next/font/local`.

RTL/LTR and language behavior:

- Server-rendered HTML starts as `<html lang="he" dir="rtl">`.
- The client language state is `"he" | "en"`, initially Hebrew.
- The top language button toggles that state.
- An effect updates `document.documentElement.lang` and `.dir`, and stores the
  language in `tzviair-goals-language`.
- The main shell and settings dialog also receive the current `dir` explicitly.
- All interface translations are hardcoded in the `translations` object in
  `site/app/page.tsx`.
- Built-in goal titles translate only while their ID is built-in and their
  stored title still equals the original Hebrew title. Once edited, or for a
  custom goal, the stored title is displayed unchanged in both languages.

## 8. Deployment

The production deployment was uploaded directly from the local project folder,
not from a working Git repository/CI pipeline. The known production command was:

```powershell
npx.cmd --yes vercel@58.1.0 deploy --prod --yes --scope yitzchak-7981s-projects
```

Vercel project linkage is preserved in `.vercel/project.json`:

- Project name: `tzviair-goals`.
- Node setting: `24.x`.
- Install command: `npm --prefix site ci` in the linked setting; root
  `vercel.json` currently overrides this with
  `npm ci && npm --prefix site ci`.
- Build: `npm --prefix site run vercel-build`.
- Output: `site/out`.
- Root Vercel functions: `api/**/*.mjs`, maximum duration 10 seconds.

The latest verified deployment remained aliased to
<https://tzviair-goals.vercel.app>. A developer needs access to the Vercel team
and connected Blob store to manage that same production project. Otherwise,
link a new project and provision a new Blob store; source alone does not grant
access to the existing private data.

Known deployment warning categories from the last deployment:

1. `engines.node` is the open range `>=22.13.0`, so Vercel warned that a future
   Node major can be selected automatically. The warning was printed more than
   once during install/build.
2. `@esbuild-kit/esm-loader@2.6.5` is deprecated.
3. `@esbuild-kit/core-utils@3.3.2` is deprecated.
4. The site dependency install reported 21 audit findings: 1 low, 4 moderate,
   and 16 high. No automatic breaking upgrade was applied.

A separate local lint warning notes the raw `<img>` used for the logo instead
of `next/image`. The build and TypeScript checks passed.

## 9. Known gaps and fragile areas

- **No authentication or authorization.** The site is public and POST has no
  PIN, login, CSRF protection, write token, or allowlist. Anyone who can reach
  the URL/API can replace the board after passing schema validation.
- **Last-write-wins synchronization.** Concurrent edits can silently overwrite
  each other because the whole array is replaced with no revision precondition.
- **No separate pause/stop.** A goal is only not-started, running, or completed.
- **Client clock dependency.** `startedAt` and `completedAt` come from the
  browser clock, so incorrect clocks affect durations/dates. Only document
  `updatedAt` comes from the server.
- **Not a PWA/offline install.** There is no service worker, manifest, or
  offline asset cache. A desktop shortcut/browser tab receives new code on
  refresh; it is not a separately installed executable.
- **Polling rather than realtime.** Every visible client reads the full JSON
  document every five seconds. There is no SSE/WebSocket/subscription.
- **Entire document is a single Blob.** This is simple but not suitable for
  heavy concurrent writes, history, audit logs, or granular permissions.
- **Deletion is destructive.** Settings can delete running or completed goals;
  protection is only a browser confirmation dialog. There is no trash/history.
- **Legacy migration loses detail.** Old booleans create completed goals with
  zero elapsed time and no completion timestamp.
- **Hardcoded seed data and translations.** Seven initial goals and all Hebrew/
  English strings live inside `site/app/page.tsx`; there is no CMS or locale
  file.
- **Edited/custom goals are not translated.** The same stored string is shown
  in both language modes.
- **UI/server title limits differ.** UI inputs use `maxLength=120`; API accepts
  up to 160.
- **HTML number bounds are not server-enforced as hours/minutes.** The API sees
  only computed `targetMs`. Programmatic client input can bypass the displayed
  hours/minutes controls as long as the final number is nonnegative and finite.
- **No explicit schema-version migration system.** Cloud `version` is checked
  only as a number on the client, and the API validates content but does not
  branch behavior by version.
- **Google Fonts are fetched at build time.** An offline/restricted build can
  fail until fonts are self-hosted.
- **Open-ended Node range.** `>=22.13.0` can drift to future majors; pinning a
  major (for example `24.x`) would make local/remote behavior more predictable.
- **Unused scaffold remains.** `site/db`, `site/examples`, `site/worker`,
  Vinext/Vite/Drizzle dependencies, and `chatgpt-auth.ts` are not used by the
  Vercel goals app. They were retained because this is a literal source export.
- **Two build paths.** Vercel uses Next.js static export plus the root function;
  the original Vinext/Cloudflare build remains for local scaffold tests. The
  next developer should decide whether to remove the unused path.
- **No automated end-to-end browser test.** Tests cover API validation,
  server-rendered content, and source markers, but not multi-browser conflicts,
  Settings interactions, fireworks, or real Blob mutation flows.

## 10. Handoff safety note

Do not POST test data to the production API. For integration testing, deploy a
Vercel preview and open it with `?cloud-test=1`; the server will then use the
preview-only pathname. Do not reuse production credentials in a new developer's
personal project unless the owner explicitly grants access.

