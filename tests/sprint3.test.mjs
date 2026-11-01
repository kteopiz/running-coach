import test from "node:test";
import assert from "node:assert/strict";
import { RECOMMENDATION_RULES, dailyCap, recommendToday } from "../src/lib/recommendation.js";

const monday = "2026-10-19";
const goal = 20;

test("QA-03 no-run, partial-goal, consecutive-run, and goal-complete recommendations", () => {
  const noRuns = recommendToday({ completedMiles: 0, goalMiles: goal, daysLeft: 7, runDates: [], today: monday });
  assert.equal(noRuns.status, "suggested");
  assert.equal(noRuns.remainingMiles, 20);
  assert.equal(noRuns.todayMiles, 2.9);
  assert.match(noRuns.message, /No runs yet this week/);

  const partial = recommendToday({
    completedMiles: 6,
    goalMiles: goal,
    daysLeft: 5,
    runDates: ["2026-10-19"],
    today: "2026-10-21",
  });
  assert.equal(partial.status, "suggested");
  assert.equal(partial.remainingMiles, 14);
  assert.equal(partial.todayMiles, 2.8);
  assert.match(partial.message, /partway/);

  const twoDays = recommendToday({
    completedMiles: 6,
    goalMiles: goal,
    daysLeft: 5,
    runDates: ["2026-10-19", "2026-10-20"],
    today: "2026-10-21",
  });
  assert.equal(twoDays.status, "suggested");
  assert.ok(twoDays.todayMiles > 0);

  const threeDays = recommendToday({
    completedMiles: 8,
    goalMiles: goal,
    daysLeft: 4,
    runDates: ["2026-10-19", "2026-10-20", "2026-10-21"],
    today: "2026-10-21",
  });
  assert.equal(threeDays.status, "rest");
  assert.equal(threeDays.todayMiles, 0);
  assert.equal(threeDays.remainingMiles, 12);
  assert.match(threeDays.message, /Rest today/);

  const complete = recommendToday({ completedMiles: goal, goalMiles: goal, daysLeft: 3, today: "2026-10-23" });
  assert.equal(complete.status, "rest");
  assert.equal(complete.todayMiles, 0);
  assert.equal(complete.remainingMiles, 0);
  assert.match(complete.message, /weekly goal is complete/);
});

test("US-11.3 recalculates today's distance from representative run changes", () => {
  const before = recommendToday({ completedMiles: 0, goalMiles: goal, daysLeft: 7, runDates: [], today: monday });
  const logged = recommendToday({ completedMiles: 4, goalMiles: goal, daysLeft: 7, runDates: [monday], today: monday });
  const editedLonger = recommendToday({ completedMiles: 9, goalMiles: goal, daysLeft: 7, runDates: [monday], today: monday });
  const movedOffWeek = recommendToday({
    completedMiles: 0,
    goalMiles: goal,
    daysLeft: 6,
    runDates: ["2026-10-18"],
    today: "2026-10-20",
  });
  const sameDayWithoutThatRun = recommendToday({
    completedMiles: 0,
    goalMiles: goal,
    daysLeft: 6,
    runDates: [],
    today: "2026-10-20",
  });
  const deleted = recommendToday({ completedMiles: 0, goalMiles: goal, daysLeft: 7, runDates: [], today: monday });

  assert.notEqual(logged.todayMiles, before.todayMiles);
  assert.notEqual(logged.remainingMiles, before.remainingMiles);
  assert.notEqual(editedLonger.todayMiles, logged.todayMiles);
  assert.equal(editedLonger.remainingMiles, 11);
  assert.equal(movedOffWeek.todayMiles, sameDayWithoutThatRun.todayMiles);
  assert.equal(movedOffWeek.remainingMiles, goal);
  assert.equal(deleted.todayMiles, before.todayMiles);
  assert.equal(deleted.message, before.message);
});

test("US-12.3 rest and reduced-distance boundaries stay inside the stated limits", () => {
  const cap = dailyCap(goal);
  assert.equal(cap, goal * RECOMMENDATION_RULES.maxGoalShare);
  assert.ok(cap <= RECOMMENDATION_RULES.maxDailyMiles);

  const largeGoal = recommendToday({ completedMiles: 0, goalMiles: 40, daysLeft: 1, today: "2026-10-25" });
  assert.equal(largeGoal.status, "reduced");
  assert.equal(largeGoal.todayMiles, RECOMMENDATION_RULES.maxDailyMiles);
  assert.ok(largeGoal.todayMiles <= RECOMMENDATION_RULES.maxDailyMiles);

  const alreadyRan = recommendToday({
    completedMiles: 3,
    goalMiles: 14,
    daysLeft: 7,
    runDates: [monday],
    today: monday,
  });
  assert.equal(alreadyRan.status, "reduced");
  assert.equal(alreadyRan.todayMiles, 0.8);
  assert.match(alreadyRan.message, /already ran today/);

  const noGoal = recommendToday({ completedMiles: 4, goalMiles: null, today: monday });
  assert.equal(noGoal.status, "no-goal");
  assert.equal(noGoal.todayMiles, null);
  assert.equal(noGoal.remainingMiles, null);
});

test("US-13.3 shows remaining miles for a partial week and zero once the goal is met", () => {
  const partial = recommendToday({
    completedMiles: 4.5,
    goalMiles: 15,
    daysLeft: 4,
    runDates: ["2026-10-19"],
    today: "2026-10-22",
  });
  assert.equal(partial.remainingMiles, 10.5);
  assert.equal(partial.todayMiles, 2.6);
  assert.ok(partial.todayMiles > 0);
  assert.ok(partial.todayMiles <= partial.remainingMiles);

  const met = recommendToday({ completedMiles: 15, goalMiles: 15, daysLeft: 2, today: "2026-10-24" });
  assert.equal(met.remainingMiles, 0);
  assert.equal(met.todayMiles, 0);
  assert.equal(met.status, "rest");

  const passed = recommendToday({ completedMiles: 18.4, goalMiles: 15, daysLeft: 2, today: "2026-10-24" });
  assert.equal(passed.remainingMiles, 0);
  assert.equal(passed.todayMiles, 0);
  assert.match(passed.message, /complete/);
});
