import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { validateMealFields } from "../src/lib/meals.js";
import { localDate } from "../src/lib/runValidation.js";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { createApi } from "../server/api.mjs";

test("meal fields follow the selected date", () => {
  const today = localDate();
  const valid = { date: today, time: "08:15", kind: "breakfast", description: "Oatmeal", calories: 400 };
  assert.deepEqual(validateMealFields(valid), {});
  assert.ok(validateMealFields({ ...valid, date: "2026-02-31" }).date);
  assert.ok(validateMealFields({ ...valid, date: "2026-01-01", time: "24:00" }, "2026-01-01").time);
  assert.ok(validateMealFields({ ...valid, kind: "brunch" }).kind);
  assert.ok(validateMealFields({ ...valid, description: "   " }).description);
  assert.ok(validateMealFields({ ...valid, calories: 0 }).calories);
  assert.ok(validateMealFields({ ...valid, calories: 10.5 }).calories);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  assert.ok(validateMealFields({ ...valid, date: localDate(tomorrow) }).date);
});

test("a meal is saved for the selected date and signed-in user", async () => {
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
  const valid = { date: today, time: "08:00", kind: "breakfast", description: "  Oatmeal  ", calories: "400", weightLb: 999 };
  try {
    assert.equal((await request("/meals")).status, 401);
    assert.equal((await request("/meals", "POST", valid)).status, 401);
    await request("/login", "POST", { email: "alex@example.com", password: "demo123" });
    assert.deepEqual((await request("/meals")).meals, []);
    assert.equal((await request("/meals", "POST", { ...valid, calories: 0 })).status, 400);
    const created = await request("/meals", "POST", valid);
    assert.equal(created.status, 201);
    assert.equal(created.meal.date, today);
    assert.equal(created.meal.description, "Oatmeal");
    assert.equal(created.meal.calories, 400);
    assert.equal(created.meal.weightLb, 145);
    const earlier = await request("/meals", "POST", { date: yesterday, time: "12:30", kind: "lunch", description: "Sandwich", calories: 600 });
    assert.equal(earlier.status, 201);
    const meals = (await request("/meals")).meals;
    assert.equal(meals.filter((meal) => meal.date === today).length, 1);
    assert.equal(meals.filter((meal) => meal.date === yesterday)[0].description, "Sandwich");
    await request("/session", "DELETE");
    cookie = "";
    await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    assert.deepEqual((await request("/meals")).meals, []);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
