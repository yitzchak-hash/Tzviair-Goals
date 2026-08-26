import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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

test("server-renders the TzviAir goals page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="he"[^>]*dir="rtl"/i);
  assert.match(html, /<title>היעדים שלנו \| צבי אייר<\/title>/);
  assert.match(html, /English/);
  assert.match(html, /הגדרות/);
  assert.match(html, /יעדים פעילים/);
  assert.match(html, /יעדים שנסגרו/);
  assert.match(html, /לסגור את פרויקט חברון/);
  assert.match(html, /לסגור את פרויקט קריית גת/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships the branded goal workflow without starter assets", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /tzviair-project-goals-v2/);
  assert.match(page, /LEGACY_STORAGE_KEY/);
  assert.match(page, /Fireworks/);
  assert.match(page, /window\.localStorage/);
  assert.match(page, /function addGoal/);
  assert.match(page, /function startGoal/);
  assert.match(page, /function finishGoal/);
  assert.match(page, /function reopenGoal/);
  assert.match(page, /function resetGoal/);
  assert.match(page, /LANGUAGE_KEY/);
  assert.match(page, /settingsOpen/);
  assert.match(page, /Reset goal and timer/);
  assert.match(page, /window\.setInterval/);
  assert.match(page, /\/api\/goals/);
  assert.match(page, /writeCloudState/);
  assert.match(page, /CLOUD_SYNC_INTERVAL_MS/);
  assert.match(page, /sync-indicator/);
  assert.match(page, /targetMs/);
  assert.match(page, /function saveGoalEdits/);
  assert.match(page, /function moveGoal/);
  assert.match(page, /function deleteGoal/);
  assert.match(page, /settings-goal-list/);
  assert.match(layout, /lang="he"/);
  assert.match(layout, /dir="rtl"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /--navy:/);
  assert.match(css, /\.closed-goals-grid/);
  assert.match(css, /\.settings-dialog/);
  assert.match(css, /\.top-controls/);
  assert.match(css, /\.settings-goal-row/);
  assert.match(css, /\.goal-target/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(
    access(new URL("../app/_sites-preview", import.meta.url)),
  );
});
