import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { INPUT_LIMITS, validateMeasurements, validateName, validateProfileFields } from "../src/lib/validation.js";
import { validateRunFields } from "../src/lib/runValidation.js";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { createApi } from "../server/api.mjs";
import { localDate } from "../src/lib/runValidation.js";

test("profile fields reject unrealistic, blank, and non-numeric values", () => {
  assert.match(validateMeasurements({ age: 1, height: 67, weight: 145 }).age, /10 to 100/);
  assert.match(validateMeasurements({ age: 400, height: 67, weight: 145 }).age, /10 to 100/);
  assert.match(validateMeasurements({ age: 25.5, height: 67, weight: 145 }).age, /whole number/);
  assert.match(validateMeasurements({ age: "abc", height: 67, weight: 145 }).age, /whole number/);
  assert.match(validateMeasurements({ age: 25, height: 1, weight: 145 }).height, /36 to 96/);
  assert.match(validateMeasurements({ age: 25, height: 120, weight: 145 }).height, /36 to 96/);
  assert.match(validateMeasurements({ age: 25, height: "no", weight: 145 }).height, /36 to 96/);
  assert.match(validateMeasurements({ age: 25, height: 67, weight: -5 }).weight, /50 to 400/);
  assert.match(validateMeasurements({ age: 25, height: 67, weight: 900 }).weight, /50 to 400/);
  assert.deepEqual(validateMeasurements({ age: 25, height: 67, weight: 145 }), {});

  const lowGoal = validateProfileFields({ age: 25, height: 67, weight: 145, weeklyMileageGoal: 0, dailyCalorieGoal: "" });
  assert.match(lowGoal.weeklyMileageGoal, /0\.1 to 100/);
  const hugeGoal = validateProfileFields({ age: 25, height: 67, weight: 145, weeklyMileageGoal: 100000, dailyCalorieGoal: "" });
  assert.match(hugeGoal.weeklyMileageGoal, /0\.1 to 100/);
  const badCalories = validateProfileFields({ age: 25, height: 67, weight: 145, weeklyMileageGoal: 15, dailyCalorieGoal: 10001 });
  assert.match(badCalories.dailyCalorieGoal, /1 to 10000/);
  const nanCalories = validateProfileFields({ age: 25, height: 67, weight: 145, weeklyMileageGoal: 15, dailyCalorieGoal: "NaN" });
  assert.ok(nanCalories.dailyCalorieGoal);
  assert.deepEqual(validateProfileFields({ age: 25, height: 67, weight: 145, weeklyMileageGoal: 15, dailyCalorieGoal: "" }), {});
  assert.equal(INPUT_LIMITS.maxWeeklyMiles, 100);
});

test("run distance, duration, and notes stay inside their limits", () => {
  const today = localDate();
  const valid = { date: today, startTime: "08:00", distanceMiles: 3, durationMinutes: 30, notes: "Easy" };
  assert.deepEqual(validateRunFields(valid), {});
  assert.match(validateRunFields({ ...valid, distanceMiles: 0.01 }).distanceMiles, /0\.1 to 100/);
  assert.match(validateRunFields({ ...valid, distanceMiles: -2 }).distanceMiles, /0\.1 to 100/);
  assert.match(validateRunFields({ ...valid, distanceMiles: 250 }).distanceMiles, /0\.1 to 100/);
  assert.match(validateRunFields({ ...valid, distanceMiles: "abc" }).distanceMiles, /0\.1 to 100/);
  assert.match(validateRunFields({ ...valid, durationMinutes: 0 }).durationMinutes, /1 to 1440/);
  assert.match(validateRunFields({ ...valid, durationMinutes: 2000 }).durationMinutes, /1 to 1440/);
  assert.match(validateRunFields({ ...valid, notes: "x".repeat(501) }).notes, /500/);
});

test("a rejected profile save leaves the stored record unchanged", async () => {
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
    assert.equal((await request("/login", "POST", { email: "alex@example.com", password: "demo123" })).ok, true);
    const before = (await request("/session")).user;
    const rejected = await request("/profile", "PATCH", { age: 1, height: 1, weight: 1, weeklyMileageGoal: 100000 });
    assert.equal(rejected.status, 400);
    assert.match(rejected.errors.age, /10 to 100/);
    assert.match(rejected.errors.height, /36 to 96/);
    assert.match(rejected.errors.weight, /50 to 400/);
    assert.match(rejected.errors.weeklyMileageGoal, /0\.1 to 100/);
    const after = (await request("/session")).user;
    assert.equal(after.age, before.age);
    assert.equal(after.height, before.height);
    assert.equal(after.weight, before.weight);
    assert.equal(after.weeklyMileageGoal, before.weeklyMileageGoal);
    assert.equal(validateName("   "), "Name is required.");
    assert.match(validateName("A".repeat(81)), /80/);
    assert.equal(validateName("  Alex Runner  "), null);
    assert.equal((await request("/register", "POST", {
      name: "A".repeat(81), email: "long-name@example.com", password: "secret1", age: 22, height: 67, weight: 145,
    })).status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
