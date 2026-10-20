import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { createApi } from "../server/api.mjs";
import { weeklyProgress } from "../src/lib/weeklyProgress.js";
import { localDate } from "../src/lib/runValidation.js";

test("run API validates inputs, isolates owners, and refreshes sorted history and weekly totals after CRUD", async () => {
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
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
  const previousSunday = new Date(monday);
  previousSunday.setDate(monday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const valid = { date: localDate(today), startTime: "08:00", distanceMiles: 3, durationMinutes: 30 };

  try {
    for (const [path, method] of [["/runs", "GET"], ["/runs", "POST"], ["/runs/1", "PATCH"], ["/runs/1", "DELETE"]]) {
      assert.equal((await request(path, method, method === "GET" ? undefined : valid)).status, 401);
    }
    await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    assert.deepEqual((await request("/runs")).runs, []);
    assert.equal((await request("/runs")).weeklyMiles, 0);
    const invalid = [
      {}, ...["date", "startTime", "distanceMiles", "durationMinutes"].map(key => ({ ...valid, [key]: "" })),
      { ...valid, startTime: "25:99" }, { ...valid, notes: "x".repeat(501) },
      { ...valid, date: "2026-02-30" }, { ...valid, date: localDate(tomorrow) },
      ...["distanceMiles", "durationMinutes"].flatMap(key => ["abc", 0, -1, null, true, [], "1e309"].map(value => ({ ...valid, [key]: value }))),
    ];
    for (const fields of invalid) assert.equal((await request("/runs", "POST", fields)).status, 400);
    assert.equal((await request("/runs")).runs.length, 0);
    const created = await request("/runs", "POST", { ...valid, user_id: 1 });
    assert.equal(created.status, 201);
    const id = created.run.id;
    assert.equal((await request("/runs")).weeklyMiles, 3);
    assert.equal((await request(`/runs/${id}`, "PATCH", { ...valid, durationMinutes: "no" })).status, 400);
    assert.equal((await request("/runs")).runs[0].durationMinutes, 30);
    const changed = await request(`/runs/${id}`, "PATCH", { ...valid, distanceMiles: 4.5, durationMinutes: 40 });
    assert.equal(changed.run.durationMinutes, 40);
    assert.equal((await request("/runs")).weeklyMiles, 4.5);
    await request(`/runs/${id}`, "PATCH", { ...valid, date: localDate(previousSunday) });
    assert.equal((await request("/runs")).weeklyMiles, 0);
    await request(`/runs/${id}`, "PATCH", { ...valid, date: localDate(monday) });
    assert.equal((await request("/runs")).weeklyMiles, 3);

    // More than five entries must remain visible; older weeks must not affect this week.
    for (let i = 0; i < 5; i++) {
      const date = new Date(previousSunday);
      date.setDate(date.getDate() - i);
      assert.equal((await request("/runs", "POST", { ...valid, date: localDate(date) })).status, 201);
    }
    const history = await request("/runs");
    assert.equal(history.runs.length, 6);
    assert.deepEqual(history.runs.map(run => run.date), history.runs.map(run => run.date).sort().reverse());
    assert.equal(history.weeklyMiles, 3);
    await request("/login", "POST", { email: "alex@example.com", password: "demo123" });
    assert.equal((await request("/runs")).runs.some(run => run.id === id), false);
    assert.equal((await request(`/runs/${id}`, "PATCH", valid)).status, 404);
    assert.equal((await request(`/runs/${id}`, "DELETE")).status, 404);
    await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    assert.equal((await request("/runs")).runs.find(run => run.id === id).distanceMiles, 3);
    assert.equal((await request(`/runs/${id}`, "DELETE")).status, 200);
    const afterDelete = await request("/runs");
    assert.equal(afterDelete.weeklyMiles, 0);
    assert.equal(afterDelete.runs.some(run => run.id === id), false);
    assert.equal((await request(`/runs/${id}`, "DELETE")).status, 404);
    assert.equal((await request(`/runs/${id}`, "PATCH", valid)).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});

test("weekly progress handles unset, incomplete, met and exceeded goals", () => {
  assert.equal(weeklyProgress(4, null).status, "no-goal");
  assert.equal(weeklyProgress(4, null).remainingMiles, null);
  assert.equal(weeklyProgress(4.5, 15).remainingMiles, 10.5);
  assert.equal(weeklyProgress(15, 15).status, "complete");
  const exceeded = weeklyProgress(18.4, 15);
  assert.equal(exceeded.status, "over-goal");
  assert.equal(exceeded.overMiles, 3.4);
  for (const miles of [15, 18.4]) {
    assert.equal(weeklyProgress(miles, 15).remainingMiles, 0);
    assert.equal(weeklyProgress(miles, 15).progress, 1);
  }
});
