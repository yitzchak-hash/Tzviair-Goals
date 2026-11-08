// Write lock for the shared goals board.
//
// Reads stay public. Writes (POST /api/goals, preview DELETE) are allowed only
// for:
//   1. a signed-in person: a signed session cookie issued by POST /api/session
//      after the team PIN is entered, sent from this app's own origin; or
//   2. a server holding a named write key: `Authorization: Bearer <key>` where
//      the key is listed in GOALS_WRITE_KEYS ("name:key,name2:key2"). Keys
//      live only in server environment variables, never in the browser.
//
// The lock is armed by GOALS_WRITE_LOCK=on. While it is off, writes behave as
// before, except that a browser on another site can no longer write (cross-
// origin requests are refused), which nothing today relies on.
// If the lock is on but its secrets are missing, writes fail closed.

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "tzviair_goals_session";
const SESSION_DAYS = 365;
const MIN_SECRET_LENGTH = 32;
const MIN_KEY_LENGTH = 24;
const MIN_PIN_LENGTH = 6;

function env(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function lockArmed() {
  return env("GOALS_WRITE_LOCK").toLowerCase() === "on";
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  if (left.length !== right.length) {
    // Still spend comparable time so length is not trivially leaked.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

function header(request, name) {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function parseWriteKeys(raw = env("GOALS_WRITE_KEYS")) {
  const keys = [];
  for (const entry of raw.split(",")) {
    const index = entry.indexOf(":");
    if (index <= 0) continue;
    const name = entry.slice(0, index).trim();
    const key = entry.slice(index + 1).trim();
    if (name && key.length >= MIN_KEY_LENGTH) keys.push({ name, key });
  }
  return keys;
}

function sessionSecret() {
  const secret = env("GOALS_SESSION_SECRET");
  return secret.length >= MIN_SECRET_LENGTH ? secret : "";
}

function teamPin() {
  const pin = env("GOALS_TEAM_PIN");
  return pin.length >= MIN_PIN_LENGTH ? pin : "";
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(now = Date.now(), secret = sessionSecret()) {
  if (!secret) throw new Error("GOALS_SESSION_SECRET is not configured.");
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `v1.${expires}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token, now = Date.now(), secret = sessionSecret()) {
  if (!secret || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const payload = parts.slice(0, 3).join(".");
  if (!safeEqual(sign(payload, secret), parts[3])) return false;
  const expires = Number(parts[1]);
  return Number.isFinite(expires) && expires > now;
}

function readCookie(request, name) {
  const raw = header(request, "cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return null;
}

// The browser's own origin check: a POST from a page on another site carries
// that site's Origin. Requests without Origin (servers, curl) are not browsers
// riding on someone's cookie, so they are judged by key only.
export function isCrossOrigin(request) {
  const origin = header(request, "origin");
  if (!origin) return false;
  const host = header(request, "x-forwarded-host") || header(request, "host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export function hasValidSession(request) {
  return verifySessionToken(readCookie(request, SESSION_COOKIE));
}

function bearer(request) {
  const value = header(request, "authorization");
  if (typeof value !== "string") return "";
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match ? match[1].trim() : "";
}

// Returns { ok: true, who } or { ok: false, status, error }.
export function authorizeWrite(request) {
  const presented = bearer(request);
  if (presented) {
    const match = parseWriteKeys().find(({ key }) => safeEqual(key, presented));
    if (match) return { ok: true, who: `key:${match.name}` };
    return { ok: false, status: 401, error: "Invalid write key." };
  }

  if (isCrossOrigin(request)) {
    return { ok: false, status: 403, error: "Cross-site writes are not allowed." };
  }

  if (!lockArmed()) return { ok: true, who: "open" };

  if (!sessionSecret()) {
    return { ok: false, status: 503, error: "Write lock is not configured." };
  }
  if (hasValidSession(request)) return { ok: true, who: "session" };
  return { ok: false, status: 401, error: "Sign in to make changes." };
}

export function checkPin(pin) {
  const expected = teamPin();
  if (!expected || typeof pin !== "string") return false;
  return safeEqual(expected, pin.trim());
}

export function sessionConfigured() {
  return Boolean(sessionSecret() && teamPin());
}

// SameSite=None lets a browser that signed in on the full board also write
// from the interactive widget inside the Job Manager iframe (where the browser
// allows third-party cookies). The Origin check above is what stops cross-site
// writes riding on this cookie.
export function sessionCookie(token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`;
}
