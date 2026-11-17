import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { calorieEstimateMessage, calorieInputs, estimateDailyCalories } from "../src/lib/calories.js";
import { calorieProgress, validateMealFields } from "../src/lib/meals.js";
import { localDate } from "../src/lib/runValidation.js";
import { apiClient } from "./helpers/api-client.mjs";

const profile = { age: 25, height: 67, weight: 145, weeklyMileageGoal: 15 };
const login = request => request("/login", "POST", { email: "alex@example.com", password: "demo123" });
const meal = { date: localDate(), time: "08:30", kind: "breakfast", description: "Oatmeal", calories: 400 };

function fixture(t) {
  const db = openDatabase(":memory:");
  initializeDatabase(db);
  t.after(() => db.close());
  return { db, request: apiClient(db) };
}

test("US-14.3 / TS-06: valid inputs give the documented estimate; missing and unsafe inputs give actionable messages", () => {
  const estimate = estimateDailyCalories(profile);
  assert.equal(estimate.calories, 1714); // 1518 resting + 196 running, rounded separately.
  assert.equal(estimate.label, "Educational estimate");
  assert.equal(estimateDailyCalories({ ...profile, age: "25", height: "67", weight: "145" }).calories, estimate.calories);
  for (const key of ["age", "height", "weight", "weeklyMileageGoal"]) {
    for (const value of [undefined, null, "", " ", "invalid", -1, 0, Infinity, NaN, true, [], {}]) {
      const invalid = { ...profile, [key]: value };
      assert.equal(calorieInputs(invalid), null, `${key}: ${String(value)}`);
      assert.equal(estimateDailyCalories(invalid), null);
    }
  }
  assert.equal(estimateDailyCalories(null), null);
  assert.equal(estimateDailyCalories({ ...profile, age: 1e9 }), null);
  assert.equal(estimateDailyCalories({ ...profile, weight: Number.MAX_VALUE }), null);
  assert.match(calorieEstimateMessage({ ...profile, age: null }), /age, height, and weight/);
  assert.match(calorieEstimateMessage({ ...profile, weeklyMileageGoal: null }), /positive weekly mileage goal/);
  assert.match(calorieEstimateMessage({ ...profile, age: 1e9 }), /Review your profile/);
});

test("US-15.3: meal calorie boundaries agree in the form and API without saving invalid records", async t => {
  const { request } = fixture(t);
  await login(request);
  for (const calories of [undefined, null, "", " ", 0, -1, 1.5, 10001, "abc", true, [], {}]) {
    assert.ok(validateMealFields({ ...meal, calories }).calories);
    const result = await request("/meals", "POST", { ...meal, calories });
    assert.equal(result.status, 400);
    assert.ok(result.errors.calories);
  }
  assert.deepEqual((await request("/meals")).meals, []);
  for (const calories of [1, "400", 10000]) {
    const result = await request("/meals", "POST", { ...meal, calories });
    assert.equal(result.status, 201);
    assert.equal(result.meal.calories, Number(calories));
  }
});

test("US-16.3 / US-17.3: ownership, edits, date moves, deletion and empty totals use saved meals", async t => {
  const { db, request } = fixture(t);
  const other = apiClient(db);
  assert.equal((await request("/meals")).status, 401);
  await login(request);
  await other("/login", "POST", { email: "sam@example.com", password: "demo123" });
  const userId = db.prepare("SELECT id FROM users WHERE email = 'sam@example.com'").get().id;
  const created = await request("/meals", "POST", { ...meal, user_id: userId, weightLb: 999 });
  assert.equal(created.status, 201);
  assert.equal(created.meal.weightLb, 145);
  const path = `/meals/${created.meal.id}`;
  assert.deepEqual((await other("/meals")).meals, []);
  assert.equal((await other(path, "PATCH", { ...meal, calories: 999 })).status, 404);
  assert.equal((await other(path, "DELETE")).status, 404);
  await request("/meals", "POST", { ...meal, time: "12:00", calories: 600 });
  const progress = async () => calorieProgress((await request("/meals")).meals, 1000, meal.date);
  assert.equal((await progress()).status, "complete");
  assert.equal((await request(path, "PATCH", { ...meal, calories: 0 })).status, 400);
  assert.equal((await progress()).consumedCalories, 1000);
  assert.equal((await request(path, "PATCH", { ...meal, calories: 800 })).status, 200);
  assert.deepEqual(await progress(), { consumedCalories: 1400, goalCalories: 1000, remainingCalories: 0, overCalories: 400, status: "over-goal" });
  await request(path, "PATCH", { ...meal, date: "2020-01-01", calories: 800 });
  assert.equal((await progress()).remainingCalories, 400);
  assert.equal(calorieProgress((await request("/meals")).meals, 1000, "2020-01-01").consumedCalories, 800);
  for (const saved of (await request("/meals")).meals) assert.equal((await request(`/meals/${saved.id}`, "DELETE")).status, 200);
  assert.deepEqual((await request("/meals")).meals, []);
  assert.equal((await progress()).remainingCalories, 1000);
  assert.equal((await request(path, "DELETE")).status, 404);
});

test("TS-06 / US-17: meal records persist across database reopen and daily goal changes recalculate totals", async t => {
  const directory = mkdtempSync(join(tmpdir(), "sprint4-"));
  let db = openDatabase(join(directory, "test.sqlite"));
  t.after(() => { db.close(); rmSync(directory, { recursive: true, force: true }); });
  initializeDatabase(db);
  let request = apiClient(db);
  await login(request);
  await request("/meals", "POST", meal);
  db.close();
  db = openDatabase(join(directory, "test.sqlite"));
  initializeDatabase(db);
  request = apiClient(db);
  await login(request);
  const saved = (await request("/meals")).meals;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].calories, 400);
  for (const goal of [2000, 400, 300, null]) {
    const updated = await request("/profile", "PATCH", { ...profile, dailyCalorieGoal: goal });
    assert.equal(updated.status, 200);
    const totals = calorieProgress(saved, updated.user.dailyCalorieGoal, meal.date);
    assert.equal(totals.remainingCalories, goal === null ? null : Math.max(0, goal - 400));
  }
});
