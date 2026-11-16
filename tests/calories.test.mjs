import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { calorieGoalOn, calorieInputs, estimateDailyCalories, validateCalorieGoal } from "../src/lib/calories.js";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { localDate } from "../src/lib/runValidation.js";
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
    assert.equal(updated.goals.length, 2);
    assert.equal(updated.goals[0].calories, 2100);
    assert.equal(updated.goals[0].age, 25);
    const later = await request("/calorie-goals", "POST", { effectiveDate: "2026-06-01", calories: 2300 });
    assert.deepEqual(later.goals.map((goal) => [goal.effectiveDate, goal.calories]), [
      ["2026-06-01", 2300],
      ["2026-01-15", 2100],
      ["2026-01-15", 2000],
    ]);
    // Both entry points feed the active goal returned to meal tracking.
    const today = localDate();
    const profile = { age: 26, height: 67, weight: 145, weeklyMileageGoal: 15, dailyCalorieGoal: 2400 };
    await request("/calorie-goals", "POST", { effectiveDate: "2000-01-01", calories: 1900 });
    const active = (await request("/session")).user.dailyCalorieGoal;
    assert.ok(active > 0);
    const saved = await request("/profile", "PATCH", profile);
    assert.equal(saved.user.dailyCalorieGoal, 2400);
    assert.equal((await request("/session")).user.dailyCalorieGoal, 2400);
    let history = (await request("/calorie-goals")).goals;
    assert.equal(calorieGoalOn(history, today).calories, 2400);
    assert.equal(calorieGoalOn(history, today).age, 26);
    await request("/profile", "PATCH", { ...profile, age: 27 });
    assert.equal(calorieGoalOn((await request("/calorie-goals")).goals, today).age, 26);
    assert.equal((await request("/profile", "PATCH", { ...profile, dailyCalorieGoal: 0 })).status, 400);
    assert.equal((await request("/session")).user.dailyCalorieGoal, 2400);
    await request("/profile", "PATCH", { ...profile, dailyCalorieGoal: 2600 });
    history = (await request("/calorie-goals")).goals;
    assert.deepEqual(history.filter((goal) => goal.effectiveDate === today).slice(0, 2).map((goal) => goal.calories), [2600, 2400]);
    assert.equal((await request("/session")).user.dailyCalorieGoal, 2600);
    const countBefore = history.length;
    await request("/profile", "PATCH", { ...profile, dailyCalorieGoal: 2600 });
    assert.equal((await request("/calorie-goals")).goals.length, countBefore);
    await request("/profile", "PATCH", { ...profile, dailyCalorieGoal: "" });
    assert.equal((await request("/session")).user.dailyCalorieGoal, null);
    history = (await request("/calorie-goals")).goals;
    assert.equal(calorieGoalOn(history, today).calories, null);
    assert.equal(calorieGoalOn(history, "2000-01-01").calories, 1900);
    initializeDatabase(db);
    assert.equal((await request("/session")).user.dailyCalorieGoal, null);
    const restored = await request("/calorie-goals", "POST", { effectiveDate: today, calories: 2200 });
    assert.equal(restored.user.dailyCalorieGoal, 2200);
    assert.deepEqual(restored.goals.filter((goal) => goal.effectiveDate === today).slice(0, 4).map((goal) => goal.calories), [2200, null, 2600, 2400]);
    assert.equal(calorieGoalOn([...restored.goals].reverse(), today).calories, 2200);
    await request("/calorie-goals", "POST", { effectiveDate: "2999-01-01", calories: 2500 });
    assert.equal((await request("/session")).user.dailyCalorieGoal, 2200);
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


test("legacy calorie goals migrate once, preserving history and the explicit profile target", () => {
  const db = openDatabase(":memory:");
  try {
    initializeDatabase(db);
    db.exec(`DROP TABLE calorie_goals;
      CREATE TABLE calorie_goals (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        effective_date TEXT NOT NULL,
        calories INTEGER NOT NULL CHECK (calories >= 1 AND calories <= 10000),
        age INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, effective_date)
      ) STRICT;
      CREATE INDEX calorie_goals_user_date ON calorie_goals(user_id, effective_date);
      INSERT INTO calorie_goals (user_id, effective_date, calories, age) VALUES
        (1, '2000-01-01', 1900, 25), (2, '2000-01-01', 2100, 30);
      UPDATE users SET daily_calorie_goal = 2300 WHERE id = 1;`);
    initializeDatabase(db);
    const goals = () => db.prepare("SELECT effective_date AS effectiveDate, calories FROM calorie_goals WHERE user_id = 1").all();
    assert.equal(calorieGoalOn(goals(), localDate()).calories, 2300);
    assert.equal(calorieGoalOn(goals(), "2000-01-01").calories, 1900);
    assert.equal(db.prepare("SELECT calories FROM calorie_goals WHERE user_id = 2").get().calories, 2100);
    db.prepare("UPDATE calorie_goals SET calories = NULL WHERE user_id = 1 AND effective_date = ?").run(localDate());
    initializeDatabase(db);
    assert.equal(calorieGoalOn(goals(), localDate()).calories, null);
    assert.equal(goals().length, 2);
  } finally { db.close(); }
});


test("same-day history migration retains cleared settings and permits multiple changes", () => {
  const db = openDatabase(":memory:");
  try {
    initializeDatabase(db);
    db.exec(`DROP TABLE calorie_goals;
      CREATE TABLE calorie_goals (
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        effective_date TEXT NOT NULL, calories INTEGER, age INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, effective_date)
      ) STRICT;
      CREATE INDEX calorie_goals_user_date ON calorie_goals(user_id, effective_date);
      INSERT INTO calorie_goals (user_id, effective_date, calories, age) VALUES (1, '2026-01-01', NULL, 25);
      UPDATE users SET daily_calorie_goal = 2200 WHERE id = 1;`);
    initializeDatabase(db);
    assert.equal(db.prepare("SELECT calories FROM calorie_goals").get().calories, null);
    db.exec("INSERT INTO calorie_goals (user_id, effective_date, calories, age) VALUES (1, '2026-01-01', 2400, 25)");
    initializeDatabase(db);
    const goals = db.prepare("SELECT id, effective_date AS effectiveDate, calories FROM calorie_goals ORDER BY id").all();
    assert.equal(goals.length, 2);
    assert.equal(calorieGoalOn(goals, '2026-01-01').calories, 2400);
  } finally { db.close(); }
});
