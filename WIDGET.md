# TzviAir Goals — embeddable widget

The goals board can be embedded as a compact tile widget inside any other
site — built for the **TzviAir Job Manager** platform's board and dashboard
pages, but usable anywhere.

The widget is served by this app itself at:

```text
https://tzviair-goals.vercel.app/widget
```

It reads and writes the exact same shared Vercel Blob state as the full board
(`tzviair-goals/shared-state.json` through `/api/goals`), so tiles in the Job
Manager always show the same live data as the TV board. The host page never
needs credentials — everything runs inside the iframe against the goals app's
own API.

## 1. Quickest embed — one script tag

Paste where the widget should appear (board page, dashboard panel, etc.):

```html
<script
  src="https://tzviair-goals.vercel.app/widget.js"
  async
  data-tzviair-goals-widget
  data-view="dashboard"
  data-lang="he"
></script>
```

The script tag is replaced by an auto-resizing iframe. Data attributes:

| Attribute | Values | Default | Meaning |
| --- | --- | --- | --- |
| `data-view` | `board` / `dashboard` | `board` | `board` = full tile grid; `dashboard` = summary strip (progress bar + counters) with compact tiles |
| `data-lang` | `he` / `en` | `he` | Widget language and direction |
| `data-interactive` | `1` | off | Show start/finish buttons on tiles. Off = read-only widget |
| `data-max` | number | all | Cap the number of tiles (a `+N more` note shows the rest) |
| `data-transparent` | `1` | off | Transparent widget background, for colored host panels |
| `data-header` | `0` | on | Hide the logo/header row |
| `data-link` | `0` | on | Hide the "open the full board" link |
| `data-height` | number / `auto` | `auto` | `auto` follows the widget's own height; a number pins it (px) |

## 2. Programmatic embed — for the Job Manager's own code

Load `widget.js` once, then mount into any container (works fine from React —
call `mount` in an effect and `destroy` on cleanup):

```html
<script src="https://tzviair-goals.vercel.app/widget.js" async></script>
```

```js
const handle = TzviAirGoalsWidget.mount("#goals-widget-slot", {
  view: "dashboard",   // "board" | "dashboard"
  lang: "he",          // "he" | "en"
  interactive: true,   // allow start/finish from the tiles
  max: 6,              // show at most 6 tiles
  transparent: true,   // blend into the dashboard panel
  header: false,       // the Job Manager draws its own panel title
  onState: (state) => {
    // Live counters for native Job Manager UI (badges, KPIs, etc.):
    // { total, completed, inProgress, notStarted }
    console.log(`${state.completed}/${state.total} goals completed`);
  },
});

// later, e.g. when the dashboard panel unmounts:
handle.destroy();
```

## 3. Plain iframe — no script at all

```html
<iframe
  src="https://tzviair-goals.vercel.app/widget?view=dashboard&lang=he"
  style="width: 100%; height: 360px; border: 0"
  title="TzviAir Goals"
></iframe>
```

Query parameters mirror the data attributes: `view`, `lang`,
`interactive=1`, `max`, `theme=transparent`, `title=0` (hide header),
`link=0`. Without `widget.js` the iframe does not auto-resize — give it a
fixed height.

## 4. postMessage contract

The widget posts messages to its parent window; `widget.js` consumes them,
but a custom host integration can listen directly. Every message carries
`source: "tzviair-goals-widget"`:

- `{ source, type: "resize", height }` — content height in px, sent on load
  and whenever the layout changes.
- `{ source, type: "state", total, completed, inProgress, notStarted }` —
  aggregate counters, sent whenever the shared goals data changes.

When listening yourself, verify `event.origin` is the goals app's origin
before trusting a message.

## 5. Behavior notes

- **Same data, same rules.** The widget polls `/api/goals` every 5 seconds
  (plus on focus/visibility), exactly like the full board. Interactive
  start/finish writes go through the same validation and last-write-wins
  storage as the board.
- **Read-only by default.** Without `interactive`, the widget never writes.
- **Preview testing.** On a Vercel preview deployment, append `cloud-test=1`
  (or pass `cloudTest: true` to `mount`) to use the isolated preview test
  blob instead of production data, same as the full board.
- **Fonts and branding** come from the goals app itself (Heebo/Rubik, brand
  colors), so tiles look identical wherever they are embedded.
- **Dark host panels.** The tiles and the summary strip are white cards and
  stay readable on any background, but in `transparent` mode the header text
  is navy — on a dark panel hide it (`data-header="0"` / `header: false`) and
  let the host draw its own panel title.
