import test from "node:test";
import assert from "node:assert/strict";
import { RECOMMENDATION_RULES, clampDaysLeft, dailyCap, daysLeftInWeek } from "../src/lib/recommendation.js";

test("recommendation inputs stay inside the stated bounds", () => {
  assert.equal(daysLeftInWeek("2026-10-19"), 7);
  assert.equal(daysLeftInWeek("2026-10-23"), 3);
  assert.equal(daysLeftInWeek("2026-10-25"), 1);
  assert.equal(clampDaysLeft(99, "2026-10-19"), RECOMMENDATION_RULES.maxDaysLeft);
  assert.equal(clampDaysLeft(0, "2026-10-19"), RECOMMENDATION_RULES.minDaysLeft);
  assert.equal(clampDaysLeft(undefined, "2026-10-23"), 3);

  const cap = dailyCap(14);
  assert.equal(cap, 3.5);
  assert.ok(cap <= RECOMMENDATION_RULES.maxDailyMiles);
  assert.ok(cap <= 14 * RECOMMENDATION_RULES.maxGoalShare + 0.05);
  assert.equal(dailyCap(100), RECOMMENDATION_RULES.maxDailyMiles);
  assert.equal(dailyCap(0), 0);
  assert.equal(dailyCap(null), 0);
  assert.equal(RECOMMENDATION_RULES.restAfterRunDays, 3);
});
