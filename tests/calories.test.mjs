import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { calorieGoalOn, calorieInputs, estimateDailyCalories, validateCalorieGoal } from "../src/lib/calories.js";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { createApi } from "../server/api.mjs";

const alex = { age: 25, heightInches: 67, weightLb: 145, weeklyMileageGoal: 15 };

test("calorie estimate accepts valid profile and running-goal inputs", () => {
  const inputs = calorieInputs(alex);
  assert.deepEqual(inputs, alex);
  assert.equal(calorieInputs({ ...alex, height: 67, weight: 145, heightInches: undefined, weightLb: undefined }).heightInches, 67);
  assert.equal(calorieInputs({ ...alex, age: 25.5 }), null);
  assert.equal(calorieInputs({ ...alex, heightInches: 0 }), null);
  assert.equal(calorieInputs({ ...alex, weightLb: -1 }), null);
  assert.equal(calorieInputs({ ...alex, weeklyMileageGoal: 0 }), null);
  assert.equal(calorieInputs({ ...alex, weeklyMileageGoal: null }), null);
});

test("daily calorie estimate is a labelled educational total", () => {
  const estimate = estimateDailyCalories(alex);
  assert.equal(estimate.label, "Educational estimate");
  assert.equal(estimate.inputs.weeklyMileageGoal, 15);
  assert.equal(estimate.calories, estimate.restingCalories + estimate.runningCalories);
  assert.ok(estimate.restingCalories > 1000);
  assert.ok(estimate.runningCalories > 0);
  assert.ok(estimateDailyCalories({ ...alex, weeklyMileageGoal: 30 }).runningCalories > estimate.runningCalories);
  assert.equal(estimateDailyCalories({ age: 30, height: 70, weight: 170 }), null);
});

test("calorie goal history resolves the goal in effect on a date", () => {
  const goals = [
    { effectiveDate: "2026-06-01", calories: 2200, age: 30 },
    { effectiveDate: "2026-01-15", calories: 2000, age: 29 },
  ];
  assert.equal(calorieGoalOn(goals, "2025-12-31"), null);
  assert.equal(calorieGoalOn(goals, "2026-01-15").calories, 2000);
  assert.equal(calorieGoalOn(goals, "2026-03-01").calories, 2000);
  assert.equal(calorieGoalOn(goals, "2026-06-01").calories, 2200);
  assert.equal(calorieGoalOn(goals, "2026-10-29").age, 30);
  assert.equal(calorieGoalOn(goals, "not-a-date"), null);
  assert.equal(validateCalorieGoal({ effectiveDate: "2026-02-31", calories: 2000 }).effectiveDate, "Enter a valid date.");
  assert.ok(validateCalorieGoal({ effectiveDate: "2026-01-15", calories: 0 }).calories);
  assert.deepEqual(validateCalorieGoal({ effectiveDate: "2026-01-15", calories: 2100 }), {});
});

test("calorie goals are saved by date and stay with their owner", async () => {
  const db = openDatabase(":memory:");
  initializeDatabase(db);
  const server = createApi(db);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = "";
  const request = async (path, method = "GET", body) => {
    const response = await fetch(url + path, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: response.status, ...await response.json() };
  };
  try {
    assert.equal((await request("/calorie-goals")).status, 401);
    assert.equal((await request("/login", "POST", { email: "alex@example.com", password: "demo123" })).ok, true);
    assert.deepEqual((await request("/calorie-goals")).goals, []);
    assert.equal((await request("/calorie-goals", "POST", { effectiveDate: "2026-02-31", calories: 2000 })).status, 400);
    assert.equal((await request("/calorie-goals", "POST", { effectiveDate: "2026-01-15", calories: 2000 })).ok, true);
    const updated = await request("/calorie-goals", "POST", { effectiveDate: "2026-01-15", calories: 2100 });
    assert.equal(updated.goals.length, 1);
    assert.equal(updated.goals[0].calories, 2100);
    assert.equal(updated.goals[0].age, 25);
    const later = await request("/calorie-goals", "POST", { effectiveDate: "2026-06-01", calories: 2300 });
    assert.deepEqual(later.goals.map((goal) => [goal.effectiveDate, goal.calories]), [
      ["2026-06-01", 2300],
      ["2026-01-15", 2100],
    ]);
    await request("/session", "DELETE");
    cookie = "";
    assert.equal((await request("/login", "POST", { email: "sam@example.com", password: "demo123" })).ok, true);
    assert.deepEqual((await request("/calorie-goals")).goals, []);
    db.prepare("DELETE FROM users WHERE email = 'alex@example.com'").run();
    assert.equal(db.prepare("SELECT count(*) AS count FROM calorie_goals").get().count, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
