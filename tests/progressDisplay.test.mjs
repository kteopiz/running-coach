import test from "node:test";
import assert from "node:assert/strict";
import { boundedProgress } from "../src/lib/progressDisplay.js";

test("progress stays below 100 until the goal is met and keeps small amounts visible", () => {
  assert.equal(boundedProgress(995 / 1000, "in-progress").label, "99.5%");
  assert.equal(boundedProgress(999 / 1000, "in-progress").label, "99.9%");
  assert.equal(boundedProgress(1, "complete").label, "100%");
  assert.equal(boundedProgress(1.5, "over-goal").label, "100%");
  assert.equal(boundedProgress(1 / 10000, "in-progress").label, "<0.1%");
  assert.equal(boundedProgress(0.5, "in-progress").label, "50%");
  assert.equal(boundedProgress(0, "in-progress").label, "0%");
});
