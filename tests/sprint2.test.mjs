import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { createApi } from "../server/api.mjs";
import { weeklyProgress } from "../src/lib/weeklyProgress.js";

function roundTenth(value) {
  return Math.round(Number(value) * 10) / 10;
}

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

test("US-06.3 accepts a valid run and rejects missing or non-numeric inputs", () => {
  const db = openDatabase(":memory:");
  try {
    initializeDatabase(db);
    const alex = db.prepare("SELECT id FROM users WHERE email = 'alex@example.com'").get();
    const insert = db.prepare(
      "INSERT INTO runs (user_id, run_date, distance_miles, duration_minutes) VALUES (?, ?, ?, ?)"
    );

    assert.doesNotThrow(() => insert.run(alex.id, "2026-10-16", 5.5, 42));
    const saved = db.prepare("SELECT distance_miles, duration_minutes FROM runs WHERE run_date = '2026-10-16'").get();
    assert.equal(saved.distance_miles, 5.5);
    assert.equal(saved.duration_minutes, 42);

    assert.throws(() =>
      db.prepare("INSERT INTO runs (user_id, distance_miles) VALUES (?, ?)").run(alex.id, 3)
    );
    assert.throws(() =>
      db.prepare("INSERT INTO runs (user_id, run_date) VALUES (?, ?)").run(alex.id, "2026-10-16")
    );
    assert.throws(() => insert.run(alex.id, "2026-10-16", "five", 30));
    assert.throws(() => insert.run(alex.id, "2026-10-16", 3, "forty"));
    assert.throws(() => insert.run(alex.id, "not-a-date", 3, 30));
    assert.throws(() => insert.run(alex.id, "2026-10-16", 0, 30));
  } finally {
    db.close();
  }
});

test("US-07.3 recalculates weekly mileage after a run is updated or deleted", async () => {
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
    const login = await request("/login", "POST", { email: "alex@example.com", password: "demo123" });
    const today = localDate(new Date());
    const run = db.prepare("SELECT id, distance_miles FROM runs WHERE user_id = ? AND run_date = ?").get(login.user.id, today);
    assert.ok(run, "sample data includes a run dated today");

    const before = await request("/runs");
    db.prepare("UPDATE runs SET distance_miles = ? WHERE id = ?").run(run.distance_miles + 2, run.id);
    const updated = await request("/runs");
    assert.equal(updated.weeklyMiles, roundTenth(before.weeklyMiles + 2));

    db.prepare("DELETE FROM runs WHERE id = ?").run(run.id);
    const deleted = await request("/runs");
    assert.equal(deleted.weeklyMiles, roundTenth(before.weeklyMiles - run.distance_miles));
    assert.equal(deleted.runs.some((item) => item.id === run.id), false);

    cookie = "";
    assert.equal((await request("/login", "POST", { email: "sam@example.com", password: "demo123" })).ok, true);
    assert.equal((await request("/runs")).weeklyMiles, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test("US-08.3 returns newest runs first and distinguishes an empty history", async () => {
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
    const sam = await request("/login", "POST", { email: "sam@example.com", password: "demo123" });
    const empty = await request("/runs");
    assert.deepEqual(empty.runs, []);
    assert.equal(empty.weeklyMiles, 0);

    db.prepare("INSERT INTO runs (user_id, run_date, distance_miles, duration_minutes) VALUES (?, ?, ?, ?)").run(
      sam.user.id, "2026-10-01", 2, 20
    );
    db.prepare("INSERT INTO runs (user_id, run_date, distance_miles, duration_minutes) VALUES (?, ?, ?, ?)").run(
      sam.user.id, "2026-10-15", 6, 55
    );
    db.prepare("INSERT INTO runs (user_id, run_date, distance_miles, duration_minutes) VALUES (?, ?, ?, ?)").run(
      sam.user.id, "2026-10-09", 4, 38
    );

    const history = await request("/runs");
    assert.deepEqual(history.runs.map((run) => run.date), ["2026-10-15", "2026-10-09", "2026-10-01"]);
    for (const run of history.runs) {
      assert.equal(typeof run.date, "string");
      assert.equal(typeof run.distanceMiles, "number");
      assert.equal(typeof run.durationMinutes, "number");
    }

    cookie = "";
    assert.equal((await request("/login", "POST", { email: "alex@example.com", password: "demo123" })).ok, true);
    const alex = await request("/runs");
    assert.ok(alex.runs.length > 0);
    for (let index = 1; index < alex.runs.length; index += 1) {
      assert.ok(alex.runs[index - 1].date >= alex.runs[index].date);
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test("US-09.3 keeps remaining mileage at zero when the goal is met or exceeded", async () => {
  assert.equal(weeklyProgress(0, 15).status, "in-progress");
  assert.equal(weeklyProgress(0, 15).remainingMiles, 15);

  const exact = weeklyProgress(15, 15);
  assert.equal(exact.status, "complete");
  assert.equal(exact.remainingMiles, 0);
  assert.equal(exact.progress, 1);

  const over = weeklyProgress(18.4, 15);
  assert.equal(over.status, "over-goal");
  assert.equal(over.remainingMiles, 0);
  assert.equal(over.overMiles, 3.4);
  assert.equal(over.progress, 1);

  for (const completed of [0, 1, 14.9, 15, 15.1, 40]) {
    assert.ok(weeklyProgress(completed, 15).remainingMiles >= 0);
  }
  assert.equal(weeklyProgress(4, null).status, "no-goal");
  assert.equal(weeklyProgress(4, null).remainingMiles, null);

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
    const login = await request("/login", "POST", { email: "alex@example.com", password: "demo123" });
    const activity = await request("/runs");
    assert.ok(activity.weeklyMiles > 0);
    const profile = {
      age: login.user.age,
      height: login.user.height,
      weight: login.user.weight,
    };

    const met = await request("/profile", "PATCH", { ...profile, weeklyMileageGoal: activity.weeklyMiles });
    const metProgress = weeklyProgress(activity.weeklyMiles, met.user.weeklyMileageGoal);
    assert.equal(metProgress.status, "complete");
    assert.equal(metProgress.remainingMiles, 0);

    const exceeded = await request("/profile", "PATCH", { ...profile, weeklyMileageGoal: 1 });
    const exceededProgress = weeklyProgress(activity.weeklyMiles, exceeded.user.weeklyMileageGoal);
    assert.equal(exceededProgress.status, "over-goal");
    assert.equal(exceededProgress.remainingMiles, 0);

    const underway = await request("/profile", "PATCH", { ...profile, weeklyMileageGoal: activity.weeklyMiles + 10 });
    const underwayProgress = weeklyProgress((await request("/runs")).weeklyMiles, underway.user.weeklyMileageGoal);
    assert.equal(underwayProgress.status, "in-progress");
    assert.equal(underwayProgress.remainingMiles, 10);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});
