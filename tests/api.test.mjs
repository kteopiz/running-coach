import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { openDatabase, initializeDatabase } from "../server/database.mjs";
import { createApi } from "../server/api.mjs";

test("API supports accounts, sessions, profile persistence, isolated runs, and immediate reset", async () => {
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
  const assertPublic = (user) => {
    assert.equal(Object.hasOwn(user, "password"), false);
    assert.equal(Object.hasOwn(user, "password_hash"), false);
  };
  try {
    assert.equal((await request("/session")).user, null);
    assert.equal((await request("/profile", "PATCH", {})).status, 401);
    assert.equal((await request("/login", "POST", { email: "alex@example.com", password: "wrong" })).status, 401);
    const login = await request("/login", "POST", { email: " ALEX@example.com ", password: "demo123" });
    assertPublic(login.user);
    const originalId = login.user.id;
    const activity = await request("/runs");
    assert.equal(activity.runs.length, 3);
    assert.ok(activity.weeklyMiles >= 3);
    assert.equal((await request("/account", "PATCH", { email: "sam@example.com" })).status, 409);
    assert.equal((await request("/profile", "PATCH", { age: 25, height: 0.5, weight: 145, weeklyMileageGoal: 15 })).status, 400);
    const profile = await request("/profile", "PATCH", { age: 26, height: 68, weight: 146, weeklyMileageGoal: 20 });
    assertPublic(profile.user);
    assert.equal(profile.user.weeklyMileageGoal, 20);
    const account = await request("/account", "PATCH", { email: "changed@example.com", password: "newpass", confirmPassword: "newpass" });
    assertPublic(account.user);
    assert.equal(account.user.id, originalId);
    assert.equal((await request("/session")).user.email, "changed@example.com");
    assert.equal((await request("/runs")).runs.length, 3);
    await request("/session", "DELETE");
    assert.equal((await request("/session")).user, null);
    assert.equal((await request("/login", "POST", { email: "alex@example.com", password: "demo123" })).ok, false);
    assert.equal((await request("/login", "POST", { email: "changed@example.com", password: "newpass" })).ok, true);
    const before = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(originalId).password_hash;
    assert.equal((await request("/reset-password", "POST", { email: "changed@example.com", password: "reset", confirmPassword: "different" })).ok, false);
    assert.equal(db.prepare("SELECT password_hash FROM users WHERE id = ?").get(originalId).password_hash, before);
    assert.equal((await request("/reset-password", "POST", { email: "missing@example.com", password: "reset", confirmPassword: "reset" })).status, 404);
    cookie = ""; // Reset while signed out, with no verification.
    assert.equal((await request("/reset-password", "POST", { email: "changed@example.com", password: "reset", confirmPassword: "reset" })).ok, true);
    assert.equal(db.prepare("SELECT count(*) AS count FROM sessions WHERE user_id = ?").get(originalId).count, 0);
    assert.equal((await request("/login", "POST", { email: "changed@example.com", password: "newpass" })).ok, false);
    assert.equal((await request("/login", "POST", { email: "changed@example.com", password: "reset" })).ok, true);
    assert.equal((await request("/session")).user.height, 68);
    const fields = { name: " New Runner ", email: "new@example.com", password: "newpass", age: 22, height: 66, weight: 135 };
    assert.equal((await request("/register", "POST", { ...fields, name: "   " })).ok, false);
    assert.equal((await request("/register", "POST", { ...fields, email: "invalid" })).ok, false);
    assert.equal((await request("/register", "POST", { ...fields, password: " " })).ok, false);
    const registered = await request("/register", "POST", fields);
    assert.equal(registered.status, 201);
    assertPublic(registered.user);
    assert.equal(registered.user.name, "New Runner");
    assert.equal((await request("/register", "POST", fields)).status, 409);
    assert.equal((await request("/runs")).runs.length, 0);
    assert.equal((await request("/runs")).weeklyMiles, 0);
    assert.equal((await request("/session")).user.email, "new@example.com");
    await request("/session", "DELETE");
    assert.equal((await request("/login", "POST", { email: "sam@example.com", password: "demo123" })).ok, true);
    assert.equal((await request("/runs")).runs.length, 0);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
