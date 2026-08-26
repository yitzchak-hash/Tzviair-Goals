import { del, get, put } from "@vercel/blob";

const STATE_PATH = "tzviair-goals/shared-state.json";
const TEST_STATE_PATH = "tzviair-goals/preview-test-state.json";
const MAX_GOALS = 200;
const MAX_TITLE_LENGTH = 160;

function isNullableTimestamp(value) {
  return value === null || (Number.isFinite(value) && value >= 0);
}

export function isValidGoal(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 160 &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    value.title.length <= MAX_TITLE_LENGTH &&
    ["not-started", "in-progress", "completed"].includes(value.status) &&
    isNullableTimestamp(value.startedAt) &&
    Number.isFinite(value.elapsedMs) &&
    value.elapsedMs >= 0 &&
    isNullableTimestamp(value.completedAt) &&
    (value.targetMs === undefined ||
      value.targetMs === null ||
      (Number.isFinite(value.targetMs) && value.targetMs >= 0))
  );
}

export function isValidGoals(value) {
  return (
    Array.isArray(value) &&
    value.length <= MAX_GOALS &&
    value.every(isValidGoal)
  );
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader(
    "Cache-Control",
    "private, no-cache, no-store, max-age=0, must-revalidate",
  );
  response.end(JSON.stringify(body));
}

async function readState(pathname) {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return null;

  const state = await new Response(result.stream).json();
  if (
    !state ||
    typeof state !== "object" ||
    !isValidGoals(state.goals) ||
    !Number.isFinite(state.updatedAt)
  ) {
    throw new Error("The shared goals state is invalid.");
  }

  return state;
}

function parseBody(request) {
  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }
  if (Buffer.isBuffer(request.body)) {
    return JSON.parse(request.body.toString("utf8"));
  }
  return request.body;
}

export default async function handler(request, response) {
  try {
    const isPreviewTest =
      process.env.VERCEL_ENV === "preview" &&
      request.headers["x-tzviair-test-board"] === "1";
    const statePath = isPreviewTest ? TEST_STATE_PATH : STATE_PATH;

    if (request.method === "GET") {
      const state = await readState(statePath);
      sendJson(
        response,
        200,
        state ?? { version: 1, goals: null, updatedAt: 0 },
      );
      return;
    }

    if (request.method === "POST") {
      const body = parseBody(request);
      if (!body || !isValidGoals(body.goals)) {
        sendJson(response, 400, { error: "Invalid goals payload." });
        return;
      }

      const state = {
        version: 1,
        goals: body.goals,
        updatedAt: Date.now(),
      };

      await put(statePath, JSON.stringify(state), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });

      sendJson(response, 200, state);
      return;
    }

    if (request.method === "DELETE" && isPreviewTest) {
      await del(TEST_STATE_PATH);
      sendJson(response, 200, { deleted: true });
      return;
    }

    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    console.error("Shared goals API error", error);
    sendJson(response, 500, {
      error: "Shared storage is temporarily unavailable.",
    });
  }
}
