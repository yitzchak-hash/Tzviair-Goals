import assert from "node:assert/strict";
import test from "node:test";

import { isValidGoal, isValidGoals } from "./goals.mjs";

const validGoal = {
  id: "goal-1",
  title: "Close the project",
  status: "in-progress",
  startedAt: 123456789,
  elapsedMs: 5000,
  completedAt: null,
  targetMs: 3_600_000,
};

test("accepts the persisted goal shape", () => {
  assert.equal(isValidGoal(validGoal), true);
  assert.equal(isValidGoal({ ...validGoal, targetMs: undefined }), true);
  assert.equal(isValidGoal({ ...validGoal, targetMs: null }), true);
  assert.equal(isValidGoals([validGoal]), true);
});

test("rejects malformed or oversized shared state", () => {
  assert.equal(isValidGoal({ ...validGoal, title: "" }), false);
  assert.equal(isValidGoal({ ...validGoal, elapsedMs: -1 }), false);
  assert.equal(isValidGoal({ ...validGoal, status: "paused" }), false);
  assert.equal(isValidGoal({ ...validGoal, targetMs: -1 }), false);
  assert.equal(isValidGoals(Array.from({ length: 201 }, () => validGoal)), false);
});
