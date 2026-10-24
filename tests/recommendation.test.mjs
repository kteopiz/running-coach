import test from "node:test";
import assert from "node:assert/strict";
import { RECOMMENDATION_RULES, clampDaysLeft, dailyCap, daysLeftInWeek, recommendToday } from "../src/lib/recommendation.js";

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

const monday = "2026-10-19";

test("today's distance stays bounded for no runs, a partial goal, and a completed goal", () => {
  const goal = 14;
  const cap = dailyCap(goal);
  assert.ok(cap <= RECOMMENDATION_RULES.maxDailyMiles);
  assert.ok(cap <= goal * RECOMMENDATION_RULES.maxGoalShare + 0.05);

  const noRuns = recommendToday({ completedMiles: 0, goalMiles: goal, daysLeft: 7, today: monday });
  assert.equal(noRuns.status, "suggested");
  assert.equal(noRuns.remainingMiles, 14);
  assert.equal(noRuns.todayMiles, 2);
  assert.ok(noRuns.todayMiles > 0);
  assert.ok(noRuns.todayMiles < goal);
  assert.match(noRuns.message, /No runs yet this week/);

  const partial = recommendToday({
    completedMiles: 4,
    goalMiles: goal,
    daysLeft: 5,
    runDates: ["2026-10-19"],
    today: "2026-10-20",
  });
  assert.equal(partial.status, "suggested");
  assert.equal(partial.remainingMiles, 10);
  assert.equal(partial.todayMiles, 2);
  assert.match(partial.message, /partway/);

  const complete = recommendToday({ completedMiles: 14, goalMiles: goal, daysLeft: 4, today: monday });
  assert.equal(complete.status, "rest");
  assert.equal(complete.remainingMiles, 0);
  assert.equal(complete.todayMiles, 0);
  assert.match(complete.message, /Rest today/);

  const exceeded = recommendToday({ completedMiles: 18.4, goalMiles: goal, daysLeft: 2, today: monday });
  assert.equal(exceeded.status, "rest");
  assert.equal(exceeded.todayMiles, 0);
  assert.equal(exceeded.remainingMiles, 0);

  const missing = recommendToday({ completedMiles: 5, goalMiles: null, daysLeft: 3, today: monday });
  assert.equal(missing.status, "no-goal");
  assert.equal(missing.todayMiles, null);
  assert.equal(missing.remainingMiles, null);
});

test("adding, editing, or deleting a run changes the recommendation", () => {
  const goal = 14;
  const before = recommendToday({ completedMiles: 0, goalMiles: goal, daysLeft: 7, runDates: [], today: monday });
  const added = recommendToday({ completedMiles: 3, goalMiles: goal, daysLeft: 7, runDates: [monday], today: monday });
  const edited = recommendToday({ completedMiles: 8, goalMiles: goal, daysLeft: 7, runDates: [monday], today: monday });
  const removed = recommendToday({ completedMiles: 0, goalMiles: goal, daysLeft: 7, runDates: [], today: monday });

  assert.notEqual(added.todayMiles, before.todayMiles);
  assert.notEqual(added.message, before.message);
  assert.notEqual(edited.todayMiles, added.todayMiles);
  assert.notEqual(edited.remainingMiles, added.remainingMiles);
  assert.equal(removed.todayMiles, before.todayMiles);
  assert.equal(removed.message, before.message);
});

test("rest and reduced-mileage safety conditions limit today's distance", () => {
  const reduced = recommendToday({
    completedMiles: 2,
    goalMiles: 20,
    daysLeft: 1,
    runDates: ["2026-10-19"],
    today: "2026-10-25",
  });
  assert.equal(reduced.remainingMiles, 18);
  assert.equal(reduced.status, "reduced");
  assert.equal(reduced.todayMiles, dailyCap(20));
  assert.ok(reduced.todayMiles < 18);

  const sameDay = recommendToday({
    completedMiles: 3,
    goalMiles: 14,
    daysLeft: 7,
    runDates: [monday],
    today: monday,
  });
  assert.equal(sameDay.status, "reduced");
  assert.ok(sameDay.todayMiles < 2);

  const frequent = recommendToday({
    completedMiles: 6,
    goalMiles: 20,
    daysLeft: 4,
    runDates: ["2026-10-19", "2026-10-20", "2026-10-21"],
    today: "2026-10-21",
  });
  assert.equal(frequent.status, "rest");
  assert.equal(frequent.todayMiles, 0);
  assert.equal(frequent.remainingMiles, 14);
});
