import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the embeddable goals widget", async () => {
  const response = await render("/widget");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /gw-shell/);
  assert.match(html, /gw-view-board/);
  assert.match(html, /היעדים של צבי־אייר/);
  assert.match(html, /tzviair-logo\.png/);
});

test("widget page, styles, and embed script stay wired together", async () => {
  const [page, css, embed] = await Promise.all([
    readFile(new URL("../app/widget/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/widget/widget.css", import.meta.url), "utf8"),
    readFile(new URL("../public/widget.js", import.meta.url), "utf8"),
  ]);

  // The widget must keep using the shared cloud board, not its own storage.
  assert.match(page, /\/api\/goals/);
  assert.match(page, /tzviair-goals-widget/);
  assert.match(page, /CLOUD_SYNC_INTERVAL_MS/);
  assert.match(page, /view=dashboard|"dashboard"/);
  assert.match(page, /interactive/);
  assert.match(page, /x-tzviair-test-board/);
  assert.match(page, /postToParent/);
  assert.match(page, /ResizeObserver/);
  assert.match(page, /targetMs/);

  assert.match(css, /\.gw-tile/);
  assert.match(css, /\.gw-progress-track/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /goals-widget-transparent/);

  assert.match(embed, /TzviAirGoalsWidget/);
  assert.match(embed, /tzviair-goals-widget/);
  assert.match(embed, /data\.type === "resize"/);
  assert.match(embed, /data\.type === "state"/);
  assert.match(embed, /event\.origin !== expectedOrigin/);
});
