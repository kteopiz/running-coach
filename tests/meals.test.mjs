import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { createApi } from "../server/api.mjs";
import { calorieProgress, validateMealFields } from "../src/lib/meals.js";
import { localDate } from "../src/lib/runValidation.js";

test("meal fields and daily calorie progress follow the selected date", () => {
  const today = localDate();
  const valid = { date: today, time: "08:15", kind: "breakfast", description: "Oatmeal", calories: 400 };
  assert.deepEqual(validateMealFields(valid), {});
  assert.ok(validateMealFields({ ...valid, date: "2026-02-31" }).date);
  assert.ok(validateMealFields({ ...valid, date: "2026-01-01", time: "24:00" }, "2026-01-01").time);
  assert.ok(validateMealFields({ ...valid, kind: "brunch" }).kind);
  assert.ok(validateMealFields({ ...valid, description: "   " }).description);
  assert.ok(validateMealFields({ ...valid, calories: 0 }).calories);
  assert.ok(validateMealFields({ ...valid, calories: 10.5 }).calories);

  const meals = [
    { date: today, calories: 400 },
    { date: today, calories: 600 },
    { date: "2020-01-01", calories: 5000 },
  ];
  assert.deepEqual(calorieProgress(meals, null, today), {
    consumedCalories: 1000, goalCalories: null, remainingCalories: null, overCalories: 0, status: "no-goal",
  });
  assert.equal(calorieProgress([], 2000, today).remainingCalories, 2000);
  assert.equal(calorieProgress(meals, 2000, today).remainingCalories, 1000);
  assert.equal(calorieProgress(meals, 1000, today).status, "complete");
  const over = calorieProgress(meals, 800, today);
  assert.equal(over.remainingCalories, 0);
  assert.equal(over.overCalories, 200);
  assert.equal(over.status, "over-goal");
  assert.equal(calorieProgress(meals, 2000, "2020-01-01").consumedCalories, 5000);
});

test("meal API saves the selected date, copies profile weight, and keeps meals private", async () => {
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
    const session = response.headers.get("set-cookie");
    if (session) cookie = session.split(";")[0];
    return { status: response.status, ...await response.json() };
  };
  const today = localDate();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDate(yesterdayDate);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const profile = { age: 25, height: 67, weight: 145, weeklyMileageGoal: 15, dailyCalorieGoal: 2000 };
  const valid = { date: today, time: "08:00", kind: "breakfast", description: "  Oatmeal  ", calories: "400", weightLb: 999 };

  try {
    for (const [path, method] of [["/meals", "GET"], ["/meals", "POST"], ["/meals/1", "PATCH"], ["/meals/1", "DELETE"]]) {
      assert.equal((await request(path, method, method === "GET" || method === "DELETE" ? undefined : valid)).status, 401);
    }
    await request("/login", "POST", { email: "alex@example.com", password: "demo123" });
    assert.deepEqual((await request("/meals")).meals, []);
    for (const fields of [
      { ...valid, date: "2026-02-31" },
      { ...valid, date: localDate(tomorrow) },
      { ...valid, time: "25:15" },
      { ...valid, kind: "brunch" },
      { ...valid, description: " " },
      { ...valid, calories: 0 },
    ]) assert.equal((await request("/meals", "POST", fields)).status, 400);
    assert.equal((await request("/meals")).meals.length, 0);

    const created = await request("/meals", "POST", valid);
    assert.equal(created.status, 201);
    assert.equal(created.meal.description, "Oatmeal");
    assert.equal(created.meal.calories, 400);
    assert.equal(created.meal.weightLb, 145);
    assert.equal(created.meal.date, today);
    const goal = await request("/profile", "PATCH", profile);
    assert.equal(goal.user.dailyCalorieGoal, 2000);
    const lunch = await request("/meals", "POST", { date: today, time: "12:30", kind: "lunch", description: "Sandwich", calories: 600 });
    const earlier = await request("/meals", "POST", { date: yesterday, time: "19:00", kind: "dinner", description: "Pasta", calories: 3000 });
    assert.equal(lunch.status, 201);
    assert.equal(earlier.status, 201);
    const day = calorieProgress((await request("/meals")).meals, 2000, today);
    assert.equal(day.consumedCalories, 1000);
    assert.equal(day.remainingCalories, 1000);

    assert.equal((await request("/profile", "PATCH", { ...profile, weight: 160 })).user.weight, 160);
    const edited = await request(`/meals/${created.meal.id}`, "PATCH", { ...valid, description: "Oatmeal and fruit", calories: 500 });
    assert.equal(edited.status, 200);
    assert.equal(edited.meal.calories, 500);
    assert.equal(edited.meal.weightLb, 145);
    const snack = await request("/meals", "POST", { date: today, time: "15:00", kind: "snack", description: "Yogurt", calories: 150 });
    assert.equal(snack.meal.weightLb, 160);
    const moved = await request(`/meals/${lunch.meal.id}`, "PATCH", { date: yesterday, time: "12:30", kind: "lunch", description: "Sandwich", calories: 600 });
    assert.equal(moved.meal.date, yesterday);
    const afterMove = calorieProgress((await request("/meals")).meals, 2000, today);
    assert.equal(afterMove.consumedCalories, 650);
    assert.equal(afterMove.remainingCalories, 1350);

    const breakfastId = created.meal.id;
    await request("/session", "DELETE");
    cookie = "";
    await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    assert.deepEqual((await request("/meals")).meals, []);
    assert.equal((await request(`/meals/${breakfastId}`, "PATCH", valid)).status, 404);
    assert.equal((await request(`/meals/${breakfastId}`, "DELETE")).status, 404);

    await request("/session", "DELETE");
    cookie = "";
    await request("/login", "POST", { email: "alex@example.com", password: "demo123" });
    assert.equal((await request(`/meals/${snack.meal.id}`, "DELETE")).status, 200);
    const remaining = await request("/meals");
    assert.equal(remaining.meals.some((meal) => meal.id === snack.meal.id), false);
    assert.equal(calorieProgress(remaining.meals, 2000, today).consumedCalories, 500);
    const alexId = remaining.meals[0].id;
    db.prepare("DELETE FROM users WHERE email = 'alex@example.com'").run();
    assert.equal(db.prepare("SELECT count(*) AS count FROM meals WHERE id = ?").get(alexId).count, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test("an older database gains the daily calorie goal and meals table", () => {
  const db = openDatabase(":memory:");
  try {
    db.exec(`CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      age INTEGER NOT NULL,
      height_inches REAL NOT NULL,
      weight_lb REAL NOT NULL,
      weekly_mileage_goal REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;`);
    initializeDatabase(db);
    const names = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
    assert.ok(names.includes("daily_calorie_goal"));
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meals'").get());
  } finally {
    db.close();
  }
});
