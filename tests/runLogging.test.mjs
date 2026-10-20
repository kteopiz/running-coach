import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { createApi } from "../server/api.mjs";
import { weeklyProgress } from "../src/lib/weeklyProgress.js";
import { localDate } from "../src/lib/runValidation.js";

async function withApi(run) {
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

  try {
    await run({ db, request });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
}

function shiftDate(date, days) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return localDate(next);
}

test("a valid run is stored for the signed-in user and invalid fields are rejected", async () => {
  await withApi(async ({ db, request }) => {
    const today = localDate();
    const valid = { date: today, startTime: "08:00", distanceMiles: 3.5, durationMinutes: 32 };
    assert.equal((await request("/runs", "POST", valid)).status, 401);

    const sam = await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    const invalid = [
      {},
      { ...valid, date: "" },
      { ...valid, distanceMiles: "" },
      { ...valid, durationMinutes: "" },
      { ...valid, distanceMiles: "abc" },
      { ...valid, durationMinutes: 0 },
      { ...valid, distanceMiles: -2 },
      { ...valid, date: "2026-02-30" },
      { ...valid, date: shiftDate(new Date(), 1) },
    ];
    for (const fields of invalid) {
      const rejected = await request("/runs", "POST", fields);
      assert.equal(rejected.status, 400);
      assert.equal(rejected.ok, false);
    }
    assert.equal((await request("/runs")).runs.length, 0);

    const created = await request("/runs", "POST", { ...valid, user_id: 1 });
    assert.equal(created.status, 201);
    assert.equal(created.run.date, today);
    assert.equal(created.run.distanceMiles, 3.5);
    assert.equal(created.run.durationMinutes, 32);

    const stored = db.prepare("SELECT user_id, run_date, distance_miles, duration_minutes FROM runs WHERE id = ?").get(created.run.id);
    assert.equal(stored.user_id, sam.user.id);
    assert.notEqual(stored.user_id, 1);
    assert.equal(stored.run_date, today);
    assert.equal(stored.distance_miles, 3.5);
    assert.equal(stored.duration_minutes, 32);
  });
});

test("the owner can edit a logged run or delete it, and history and weekly miles update", async () => {
  await withApi(async ({ request }) => {
    const today = localDate();
    await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    const created = await request("/runs", "POST", { date: today, startTime: "08:00", distanceMiles: 3, durationMinutes: 30 });
    const id = created.run.id;

    const edited = await request(`/runs/${id}`, "PATCH", { date: today, startTime: "08:00", distanceMiles: 4.5, durationMinutes: 41 });
    assert.equal(edited.status, 200);
    assert.deepEqual(
      { date: edited.run.date, distanceMiles: edited.run.distanceMiles, durationMinutes: edited.run.durationMinutes },
      { date: today, distanceMiles: 4.5, durationMinutes: 41 },
    );

    const history = await request("/runs");
    const saved = history.runs.find((run) => run.id === id);
    assert.equal(saved.distanceMiles, 4.5);
    assert.equal(saved.durationMinutes, 41);
    assert.equal(history.weeklyMiles, 4.5);

    const invalidEdit = await request(`/runs/${id}`, "PATCH", { date: today, startTime: "08:00", distanceMiles: 4.5, durationMinutes: "" });
    assert.equal(invalidEdit.status, 400);
    assert.equal((await request("/runs")).runs.find((run) => run.id === id).durationMinutes, 41);

    await request("/login", "POST", { email: "alex@example.com", password: "demo123" });
    assert.equal((await request(`/runs/${id}`, "PATCH", { date: today, startTime: "08:00", distanceMiles: 9, durationMinutes: 90 })).status, 404);
    assert.equal((await request(`/runs/${id}`, "DELETE")).status, 404);

    await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    assert.equal((await request("/runs")).runs.find((run) => run.id === id).distanceMiles, 4.5);
    assert.equal((await request(`/runs/${id}`, "DELETE")).status, 200);
    const afterDelete = await request("/runs");
    assert.equal(afterDelete.runs.some((run) => run.id === id), false);
    assert.equal(afterDelete.weeklyMiles, 0);
  });
});

test("run history is ordered by date and includes date, distance, and duration", async () => {
  await withApi(async ({ request }) => {
    const today = new Date();
    await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    await request("/runs", "POST", { date: shiftDate(today, -10), startTime: "08:00", distanceMiles: 2, durationMinutes: 20 });
    await request("/runs", "POST", { date: shiftDate(today, -2), startTime: "07:00", distanceMiles: 5, durationMinutes: 48 });
    await request("/runs", "POST", { date: shiftDate(today, -2), startTime: "18:00", distanceMiles: 1, durationMinutes: 12 });

    const history = await request("/runs");
    assert.deepEqual(history.runs.map((run) => [run.date, run.distanceMiles, run.durationMinutes]), [
      [shiftDate(today, -2), 1, 12],
      [shiftDate(today, -2), 5, 48],
      [shiftDate(today, -10), 2, 20],
    ]);
    for (const run of history.runs) {
      assert.equal(typeof run.date, "string");
      assert.equal(typeof run.distanceMiles, "number");
      assert.equal(typeof run.durationMinutes, "number");
    }
    const dates = history.runs.map((run) => run.date);
    assert.deepEqual(dates, [...dates].sort().reverse());
  });
});

test("weekly remaining mileage stays at zero when completed distance meets or passes the goal", async () => {
  await withApi(async ({ request }) => {
    const today = localDate();
    const login = await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    await request("/runs", "POST", { date: today, startTime: "08:00", distanceMiles: 6, durationMinutes: 55 });
    const activity = await request("/runs");
    assert.equal(activity.weeklyMiles, 6);

    const profile = { age: login.user.age, height: login.user.height, weight: login.user.weight };
    const under = await request("/profile", "PATCH", { ...profile, weeklyMileageGoal: 10 });
    const underProgress = weeklyProgress(activity.weeklyMiles, under.user.weeklyMileageGoal);
    assert.equal(underProgress.completedMiles, 6);
    assert.equal(underProgress.remainingMiles, 4);
    assert.ok(underProgress.remainingMiles >= 0);

    const met = await request("/profile", "PATCH", { ...profile, weeklyMileageGoal: 6 });
    const metProgress = weeklyProgress((await request("/runs")).weeklyMiles, met.user.weeklyMileageGoal);
    assert.equal(metProgress.remainingMiles, 0);
    assert.equal(metProgress.progress, 1);

    const over = await request("/profile", "PATCH", { ...profile, weeklyMileageGoal: 4 });
    const overProgress = weeklyProgress((await request("/runs")).weeklyMiles, over.user.weeklyMileageGoal);
    assert.equal(overProgress.remainingMiles, 0);
    assert.equal(overProgress.overMiles, 2);
    assert.equal(overProgress.progress, 1);

    for (const completed of [0, 3.9, 4, 6, 20]) {
      assert.ok(weeklyProgress(completed, 4).remainingMiles >= 0);
    }
  });
});

test("a start time and notes tell same-day runs apart and survive an edit", async () => {
  await withApi(async ({ request }) => {
    const today = localDate();
    await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    const morning = await request("/runs", "POST", {
      date: today, startTime: "07:15", distanceMiles: 3, durationMinutes: 28, notes: "Easy miles",
    });
    const evening = await request("/runs", "POST", {
      date: today, startTime: "18:40", distanceMiles: 5, durationMinutes: 44, notes: "  Tempo  ",
    });
    assert.equal(morning.status, 201);
    assert.equal(evening.status, 201);
    assert.equal(morning.run.startTime, "07:15");
    assert.equal(evening.run.notes, "Tempo");

    const history = await request("/runs");
    assert.deepEqual(history.runs.map((run) => [run.startTime, run.notes]), [
      ["18:40", "Tempo"],
      ["07:15", "Easy miles"],
    ]);

    const edited = await request(`/runs/${morning.run.id}`, "PATCH", {
      date: today, startTime: "07:30", distanceMiles: 3.2, durationMinutes: 30, notes: "Easy miles, felt good",
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.run.startTime, "07:30");
    assert.equal(edited.run.notes, "Easy miles, felt good");

    const kept = await request(`/runs/${evening.run.id}`, "PATCH", {
      date: today, startTime: "18:40", distanceMiles: 5, durationMinutes: 44,
    });
    assert.equal(kept.run.notes, "Tempo");
  });
});
