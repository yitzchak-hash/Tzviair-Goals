# Goals write lock — report (map row 31.4, item X8)

## What was open

| Door | Before | Now |
| --- | --- | --- |
| `POST /api/goals` (replaces the whole board) | Anyone on the internet could overwrite or empty the board — no login, key or origin check. A plain HTML form on any other website could also do it from a visitor's browser (a `text/plain` POST was parsed as JSON). | Refused unless signed in or holding a named server key (once the lock is on). Other websites are refused right away, lock on or off. |
| `DELETE /api/goals` (preview test board only) | Open on preview deployments with one header. | Same rule as POST. |
| `GET /api/goals` (read) | Public. | Unchanged — still public. |
| Database rules | None exist: storage is one private Vercel Blob file, reached only through the API with a server-side token. | Unchanged. No rules file is needed. |
| Keys in the browser bundle | None found (checked the built `site/out` and full git history). | Still none. All new secrets are server-only env vars. |
| Other code paths (`site/worker`, `site/examples/d1`, `site/db`) | Unused starter code; not deployed by the Vercel build. | Unchanged. |

## How the lock works

- **People:** the board shows "לצפייה בלבד — כניסה" / "View only — sign in" in the
  top bar. They tap it (or just try a change), type the **team PIN** once, and
  the browser gets a signed, HttpOnly cookie that lasts one year. A refused
  change is undone on screen right away, with a message saying why.
- **Other apps (servers):** send `Authorization: Bearer <key>`, where the key
  is listed by name in `GOALS_WRITE_KEYS` (e.g. `job-manager:…`). Keys stay
  in server env vars only.
- **Cross-site guard:** a browser write coming from another website's page is
  refused (403), even with a valid cookie.
- **Fail closed:** if the lock is on but the session secret is missing, writes
  return 503 instead of opening up.
- **Widget:** read-only by default — unaffected. In interactive mode, a refused
  change is undone and the status dot says "View only — sign in on the full
  board". A browser that signed in on the full board can also write from the
  widget wherever that browser allows third-party cookies (Chrome yes; Safari
  and Firefox block them).

Code: `lib/write-auth.mjs` (rules), `api/session.mjs` (sign-in),
`api/goals.mjs` (gate on POST/DELETE), board and widget UI in `site/app/`.

## Nothing breaks on deploy

The lock is **off by default**. Deploying this code changes only one thing:
other websites can no longer write. The TV board, every computer and the
widget keep working exactly as today until the owner turns the lock on.

## To apply live (manager / owner — not done by this branch)

Vercel project `tzviair-goals` → Settings → Environment Variables
(Production and Preview), then redeploy:

1. `GOALS_SESSION_SECRET` = a random string of 32 or more characters.
2. `GOALS_TEAM_PIN` = the team PIN (6 or more characters; a short phrase is
   safer than digits — each wrong try waits almost a second, but there is no
   lock-out).
3. `GOALS_WRITE_KEYS` = only when another app needs to write, e.g.
   `job-manager:<32+ random characters>`.
4. `GOALS_WRITE_LOCK` = `on` — set this last, after the PIN has been shared
   with the team. Each computer (including the TV) will ask for the PIN once
   on its next change.

To undo: delete `GOALS_WRITE_LOCK` (or set it to `off`) and redeploy.

## Proof

`tests/write-lock.test.mjs` (run with `npm test`) uses the real handlers on an
in-memory store — never the live Blob:

- lock on, unsigned browser write → **401**, nothing stored;
- lock on, unsigned server write (no Origin, no key) → **401**;
- wrong PIN → 401, no cookie; right PIN → cookie → write **200**, stored;
- forged cookie → 401; wrong key → 401; named key → **200**;
- valid cookie from another site's page → **403**;
- lock on but secret missing → **503** (fails closed);
- reads stay open with the lock on;
- lock off (today): same-site board write → 200; other site → 403.

Also checked in a real browser (local build, lock on): the board loads as
"view only", a start click is refused and undone, wrong PIN shows an error,
the right PIN signs in and the next change saves (desktop and phone width).

## What's New line (shows only once the lock is on)

- עברית: "הלוח ננעל לשינויים — כדי לשנות יעדים מזינים פעם אחת את קוד הצוות."
- English: "The board is now locked for changes — enter the team PIN once to edit goals."
