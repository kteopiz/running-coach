import test from "node:test";
import assert from "node:assert/strict";
import { calorieChartDays, dailyTimeline, groupMealsByDay, runGoalDifference, weeklyCalorieDifference } from "../src/lib/summary.js";
import { weekBounds } from "../src/lib/week.js";

test("the calorie chart compares logged calories with the dated goal and skips future goals", () => {
  const today = "2026-11-16";
  const week = weekBounds(today);
  assert.equal(week.startDate, "2026-11-15");
  assert.equal(week.endDate, "2026-11-21");
  const chart = calorieChartDays({
    today,
    meals: [
      { date: "2026-11-15", calories: 400 },
      { date: "2026-11-15", calories: 100 },
      { date: "2026-11-14", calories: 900 },
    ],
    goals: [
      { effectiveDate: "2026-11-01", calories: 2000 },
      { effectiveDate: "2099-01-01", calories: 10000 },
    ],
  });
  assert.equal(chart.empty, false);
  assert.equal(chart.rows[0].date, "2026-11-15");
  assert.equal(chart.rows[0].consumed, 500);
  assert.equal(chart.rows[0].goal, 2000);
  assert.equal(chart.rows.at(-1).date, "2026-11-16");
  assert.equal(chart.rows.at(-1).goal, 2000);
  assert.ok(chart.rows.every((row) => row.goal !== 10000));

  const missing = calorieChartDays({
    today,
    meals: [{ date: "2026-11-10", calories: 300 }],
    goals: [{ effectiveDate: "2099-01-01", calories: 10000 }],
  });
  assert.equal(missing.empty, true);
});

test("weekly totals use a Sunday start, including a week that crosses a month", () => {
  const week = weekBounds("2026-11-01");
  assert.equal(week.startDate, "2026-11-01");
  assert.equal(week.endDate, "2026-11-07");
  assert.equal(week.todayDate, "2026-11-01");
});

test("run and meal differences use the weekly goal and the dated calorie target", () => {
  assert.deepEqual(runGoalDifference({ completedMiles: 0, weeklyGoal: 15 }), {
    status: "below", completed: 0, goal: 15, difference: -15,
  });
  assert.equal(runGoalDifference({ completedMiles: 16.2, weeklyGoal: 15 }).status, "above");
  assert.equal(runGoalDifference({ completedMiles: 15, weeklyGoal: 15 }).status, "met");
  assert.equal(runGoalDifference({ completedMiles: 4, weeklyGoal: null }).status, "missing");

  const compared = weeklyCalorieDifference({
    today: "2026-11-16",
    dailyGoal: 3000,
    meals: [
      { date: "2026-11-16", kind: "breakfast", calories: 800 },
      { date: "2026-11-14", kind: "breakfast", calories: 900 },
    ],
    goals: [],
  });
  assert.equal(compared.startDate, "2026-11-15");
  assert.equal(compared.target, 3000);
  assert.equal(compared.consumed, 800);
  assert.equal(compared.status, "below");
  assert.equal(weeklyCalorieDifference({ today: "2026-11-16", meals: [], goals: [], dailyGoal: 3000 }).status, "missing");
});

test("meals group by day and period and the weekly total matches the days", () => {
  const grouped = groupMealsByDay({
    today: "2026-11-16",
    meals: [
      { id: 1, date: "2026-11-16", time: "08:30", kind: "breakfast", description: "Oats", calories: 400 },
      { id: 2, date: "2026-11-16", time: "12:00", kind: "lunch", description: "Rice", calories: 600 },
      { id: 3, date: "2026-11-15", time: "19:00", kind: "dinner", description: "Pasta", calories: 700 },
      { id: 4, date: "2026-11-15", time: "21:00", kind: "snack", description: "Yogurt", calories: 150 },
      { id: 5, date: "2026-11-08", time: "08:00", kind: "breakfast", description: "Old", calories: 900 },
    ],
  });
  assert.deepEqual(grouped.days.map((day) => day.date), ["2026-11-15", "2026-11-16"]);
  assert.deepEqual(grouped.days[1].periods.map((period) => period.kind), ["breakfast", "lunch"]);
  assert.equal(grouped.total, grouped.days.reduce((sum, day) => sum + day.calories, 0));
  assert.equal(grouped.total, 1850);
  assert.equal(groupMealsByDay({ today: "2026-11-15", meals: [] }).empty, true);
});

test("a daily timeline orders a run before a later breakfast and totals those items", () => {
  const timeline = dailyTimeline({
    date: "2026-11-15",
    runs: [
      { id: 1, date: "2026-11-15", startTime: "08:00", distanceMiles: 3, notes: "Easy" },
      { id: 2, date: "2026-11-15", startTime: null, distanceMiles: 1, notes: "" },
      { id: 3, date: "2026-11-14", startTime: "07:00", distanceMiles: 5, notes: "Other day" },
    ],
    meals: [
      { id: 9, date: "2026-11-15", time: "08:30", kind: "breakfast", description: "Oats", calories: 400 },
    ],
  });
  assert.deepEqual(timeline.items.map((item) => [item.type, item.time]), [
    ["run", "08:00"],
    ["meal", "08:30"],
    ["run", ""],
  ]);
  assert.equal(timeline.miles, 4);
  assert.equal(timeline.calories, 400);
});
