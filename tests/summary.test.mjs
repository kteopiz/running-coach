import test from "node:test";
import assert from "node:assert/strict";
import { calorieChartDays } from "../src/lib/summary.js";
import { weekBounds } from "../src/lib/week.js";

test("the calorie chart compares logged calories with the dated goal and skips future goals", () => {
  const today = "2026-11-15";
  const week = weekBounds(today);
  assert.equal(week.startDate, "2026-11-09");
  assert.equal(week.endDate, "2026-11-15");
  const chart = calorieChartDays({
    today,
    meals: [
      { date: "2026-11-09", calories: 400 },
      { date: "2026-11-09", calories: 100 },
      { date: "2026-11-08", calories: 900 },
    ],
    goals: [
      { effectiveDate: "2026-11-01", calories: 2000 },
      { effectiveDate: "2099-01-01", calories: 10000 },
    ],
  });
  assert.equal(chart.empty, false);
  assert.equal(chart.rows[0].date, "2026-11-09");
  assert.equal(chart.rows[0].consumed, 500);
  assert.equal(chart.rows[0].goal, 2000);
  assert.equal(chart.rows.at(-1).date, "2026-11-15");
  assert.equal(chart.rows.at(-1).goal, 2000);
  assert.ok(chart.rows.every((row) => row.goal !== 10000));

  const missing = calorieChartDays({
    today,
    meals: [{ date: "2026-11-10", calories: 300 }],
    goals: [{ effectiveDate: "2099-01-01", calories: 10000 }],
  });
  assert.equal(missing.empty, true);
});
