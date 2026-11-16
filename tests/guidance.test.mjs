import test from "node:test";
import assert from "node:assert/strict";
import { recommendToday } from "../src/lib/recommendation.js";

const sunday = "2026-11-15";

test("an unconstrained goal names the even weekly allocation", () => {
  const result = recommendToday({ completedMiles: 0, goalMiles: 14, daysLeft: 7, today: sunday });
  assert.equal(result.rule, "even");
  assert.equal(result.status, "suggested");
  assert.equal(result.todayMiles, 2);
  assert.match(result.message, /even weekly allocation of 2 miles/);
  assert.doesNotMatch(result.message, /25%/);
  assert.doesNotMatch(result.message, /daily safety cap/);
});

test("a goal held by the 25% allocation names that rule and the even split it replaced", () => {
  const result = recommendToday({ completedMiles: 0, goalMiles: 15, daysLeft: 1, today: sunday });
  assert.equal(result.rule, "weekly-allocation");
  assert.equal(result.status, "reduced");
  assert.equal(result.todayMiles, 3.7);
  assert.match(result.message, /capped at 3\.7 miles/);
  assert.match(result.message, /25% of your 15-mile week/);
  assert.match(result.message, /never goes above 6 miles/);
  assert.match(result.message, /would be 15 miles today/);
  assert.doesNotMatch(result.message, /less than an even split/);
});

test("a goal held by the daily safety cap names 6 miles rather than the 25% allocation", () => {
  const result = recommendToday({ completedMiles: 0, goalMiles: 40, daysLeft: 1, today: sunday });
  assert.equal(result.rule, "daily-cap");
  assert.equal(result.todayMiles, 6);
  assert.match(result.message, /daily safety cap/);
  assert.match(result.message, /capped at 6 miles/);
  assert.match(result.message, /less than 25% of your 40-mile week/);
  assert.match(result.message, /would be 40 miles today/);
});

test("a run already logged today halves the capped suggestion and still names the rule", () => {
  const halved = recommendToday({
    completedMiles: 2,
    goalMiles: 15,
    daysLeft: 1,
    runDates: [sunday],
    today: sunday,
  });
  assert.equal(halved.todayMiles, 1.9);
  assert.equal(halved.rule, "weekly-allocation");
  assert.match(halved.message, /already ran today/);
  assert.match(halved.message, /half of the 3\.7-mile cap/);
  assert.match(halved.message, /25% of your 15-mile week/);
});
