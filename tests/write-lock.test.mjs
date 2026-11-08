// Proves the write lock: with the lock on, an unsigned write is refused and
// nothing is stored; a signed-in browser write and a named server key work;
// reads stay open. Runs against an in-memory store, never the real Blob.

import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { createHandler } from "../api/goals.mjs";
import sessionHandler from "../api/session.mjs";

const HOST = "tzviair-goals.vercel.app";
const ORIGIN = `https://${HOST}`;
const SECRET = "test-session-secret-0123456789abcdef";
const PIN = "4826-shalom";
const JOB_MANAGER_KEY = "jm-test-key-0123456789abcdef";

const goal = {
  id: "goal-1",
  title: "Close the project",
  status: "not-started",
  startedAt: null,
  elapsedMs: 0,
  completedAt: null,
};

function memoryStorage() {
  const blobs = new Map();
  return {
    blobs,
    async get(pathname) {
      if (!blobs.has(pathname)) return null;
      return { statusCode: 200, stream: new Blob([blobs.get(pathname)]).stream() };
    },
    async put(pathname, body) {
      blobs.set(pathname, body);
    },
    async del(pathname) {
      blobs.delete(pathname);
    },
  };
}

async function call(handler, { method = "GET", headers = {}, body } = {}) {
  const request = {
    method,
    headers: { host: HOST, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
  const response = {
    statusCode: 0,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(text) {
      this.text = text;
    },
  };
  await handler(request, response);
  return { status: response.statusCode, headers: response.headers, json: JSON.parse(response.text) };
}

const saved = {};
const ENV = ["GOALS_WRITE_LOCK", "GOALS_SESSION_SECRET", "GOALS_TEAM_PIN", "GOALS_WRITE_KEYS"];

beforeEach(() => {
  for (const name of ENV) saved[name] = process.env[name];
  process.env.GOALS_SESSION_SECRET = SECRET;
  process.env.GOALS_TEAM_PIN = PIN;
  process.env.GOALS_WRITE_KEYS = `job-manager:${JOB_MANAGER_KEY}`;
});

afterEach(() => {
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});

test("lock on: an unsigned browser write is refused and nothing is stored", async () => {
  process.env.GOALS_WRITE_LOCK = "on";
  const storage = memoryStorage();
  const goals = createHandler(storage);

  const result = await call(goals, {
    method: "POST",
    headers: { origin: ORIGIN },
    body: { goals: [goal] },
  });

  assert.equal(result.status, 401);
  assert.equal(result.json.locked, true);
  assert.equal(storage.blobs.size, 0);
});

test("lock on: an unsigned server write (no Origin, no key) is refused", async () => {
  process.env.GOALS_WRITE_LOCK = "on";
  const storage = memoryStorage();
  const result = await call(createHandler(storage), { method: "POST", body: { goals: [goal] } });
  assert.equal(result.status, 401);
  assert.equal(storage.blobs.size, 0);
});

test("lock on: a wrong PIN gets no session; the right PIN signs in and the write works", async () => {
  process.env.GOALS_WRITE_LOCK = "on";
  const storage = memoryStorage();
  const goals = createHandler(storage);

  const wrong = await call(sessionHandler, {
    method: "POST",
    headers: { origin: ORIGIN },
    body: { pin: "0000-wrong" },
  });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.headers["set-cookie"], undefined);

  const signIn = await call(sessionHandler, {
    method: "POST",
    headers: { origin: ORIGIN },
    body: { pin: PIN },
  });
  assert.equal(signIn.status, 200);
  const cookie = signIn.headers["set-cookie"].split(";")[0];
  assert.match(signIn.headers["set-cookie"], /HttpOnly/);

  const status = await call(sessionHandler, { headers: { cookie } });
  assert.deepEqual(status.json, { locked: true, signedIn: true });

  const write = await call(goals, {
    method: "POST",
    headers: { origin: ORIGIN, cookie },
    body: { goals: [goal] },
  });
  assert.equal(write.status, 200);
  assert.deepEqual(write.json.goals, [goal]);
  assert.equal(storage.blobs.size, 1);
});

test("lock on: a forged or tampered session cookie is refused", async () => {
  process.env.GOALS_WRITE_LOCK = "on";
  const storage = memoryStorage();
  const forged = `tzviair_goals_session=v1.${Date.now() + 1e9}.abc.AAAA`;
  const result = await call(createHandler(storage), {
    method: "POST",
    headers: { origin: ORIGIN, cookie: forged },
    body: { goals: [goal] },
  });
  assert.equal(result.status, 401);
  assert.equal(storage.blobs.size, 0);
});

test("lock on: a named server key writes; a wrong key is refused", async () => {
  process.env.GOALS_WRITE_LOCK = "on";
  const storage = memoryStorage();
  const goals = createHandler(storage);

  const bad = await call(goals, {
    method: "POST",
    headers: { authorization: "Bearer not-the-key-0123456789abcdef" },
    body: { goals: [goal] },
  });
  assert.equal(bad.status, 401);
  assert.equal(storage.blobs.size, 0);

  const good = await call(goals, {
    method: "POST",
    headers: { authorization: `Bearer ${JOB_MANAGER_KEY}` },
    body: { goals: [goal] },
  });
  assert.equal(good.status, 200);
  assert.equal(storage.blobs.size, 1);
});

test("lock on: a signed-in cookie riding on another site's page is refused", async () => {
  process.env.GOALS_WRITE_LOCK = "on";
  const storage = memoryStorage();
  const signIn = await call(sessionHandler, {
    method: "POST",
    headers: { origin: ORIGIN },
    body: { pin: PIN },
  });
  const cookie = signIn.headers["set-cookie"].split(";")[0];
  const result = await call(createHandler(storage), {
    method: "POST",
    headers: { origin: "https://evil.example", cookie },
    body: { goals: [goal] },
  });
  assert.equal(result.status, 403);
  assert.equal(storage.blobs.size, 0);
});

test("lock on but secret missing: writes fail closed", async () => {
  process.env.GOALS_WRITE_LOCK = "on";
  delete process.env.GOALS_SESSION_SECRET;
  const storage = memoryStorage();
  const result = await call(createHandler(storage), {
    method: "POST",
    headers: { origin: ORIGIN },
    body: { goals: [goal] },
  });
  assert.equal(result.status, 503);
  assert.equal(storage.blobs.size, 0);
});

test("reads stay open with the lock on", async () => {
  process.env.GOALS_WRITE_LOCK = "on";
  const storage = memoryStorage();
  const goals = createHandler(storage);
  await call(goals, {
    method: "POST",
    headers: { authorization: `Bearer ${JOB_MANAGER_KEY}` },
    body: { goals: [goal] },
  });
  const read = await call(goals, { headers: { origin: ORIGIN } });
  assert.equal(read.status, 200);
  assert.deepEqual(read.json.goals, [goal]);
});

test("lock off (today's setting): same-site board writes keep working, other sites cannot write", async () => {
  delete process.env.GOALS_WRITE_LOCK;
  const storage = memoryStorage();
  const goals = createHandler(storage);

  const board = await call(goals, {
    method: "POST",
    headers: { origin: ORIGIN },
    body: { goals: [goal] },
  });
  assert.equal(board.status, 200);

  const otherSite = await call(goals, {
    method: "POST",
    headers: { origin: "https://evil.example" },
    body: { goals: [] },
  });
  assert.equal(otherSite.status, 403);
  assert.deepEqual(JSON.parse(storage.blobs.get("tzviair-goals/shared-state.json")).goals, [goal]);
});
