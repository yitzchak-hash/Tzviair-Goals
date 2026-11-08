// Sign-in for people who change the goals board.
//
//   GET    /api/session  -> { locked, signedIn }  (locked = the write lock is on)
//   POST   /api/session  { pin } -> sets the signed session cookie
//   DELETE /api/session  -> signs this browser out
//
// The team PIN and session secret live only in server environment variables.

import {
  checkPin,
  clearedSessionCookie,
  createSessionToken,
  hasValidSession,
  isCrossOrigin,
  lockArmed,
  sessionConfigured,
  sessionCookie,
} from "../lib/write-auth.mjs";

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  response.end(JSON.stringify(body));
}

function parseBody(request) {
  try {
    if (typeof request.body === "string") return JSON.parse(request.body);
    if (Buffer.isBuffer(request.body)) {
      return JSON.parse(request.body.toString("utf8"));
    }
    return request.body;
  } catch {
    return null;
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, {
      locked: lockArmed(),
      signedIn: hasValidSession(request),
    });
    return;
  }

  if (isCrossOrigin(request)) {
    sendJson(response, 403, { error: "Cross-site requests are not allowed." });
    return;
  }

  if (request.method === "POST") {
    if (!sessionConfigured()) {
      sendJson(response, 503, { error: "Sign-in is not configured." });
      return;
    }
    const body = parseBody(request);
    if (!body || !checkPin(body.pin)) {
      await delay(800); // slows down guessing
      sendJson(response, 401, { error: "Wrong PIN." });
      return;
    }
    response.setHeader("Set-Cookie", sessionCookie(createSessionToken()));
    sendJson(response, 200, { locked: lockArmed(), signedIn: true });
    return;
  }

  if (request.method === "DELETE") {
    response.setHeader("Set-Cookie", clearedSessionCookie());
    sendJson(response, 200, { locked: lockArmed(), signedIn: false });
    return;
  }

  response.setHeader("Allow", "GET, POST, DELETE");
  sendJson(response, 405, { error: "Method not allowed." });
}
