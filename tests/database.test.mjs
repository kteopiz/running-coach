import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, initializeDatabase } from "../server/database.mjs";

test("setup seeds once, preserves edits across reopen, and reset restores fixtures", () => {
  const directory = mkdtempSync(join(tmpdir(), "running-coach-test-"));
  const path = join(directory, "test.sqlite");
  let db;
  try {
    db = openDatabase(path);
    assert.equal(initializeDatabase(db), true);
    assert.equal(db.prepare("SELECT count(*) AS count FROM users").get().count, 2);
    assert.equal(db.prepare("SELECT count(*) AS count FROM runs").get().count, 3);
    const alex = db.prepare("SELECT * FROM users WHERE email = 'alex@example.com'").get();
    db.prepare("UPDATE users SET email = ?, weekly_mileage_goal = ? WHERE id = ?").run("changed@example.com", 22, alex.id);
    assert.equal(initializeDatabase(db), false);
    assert.equal(db.prepare("SELECT count(*) AS count FROM runs").get().count, 3);
    db.close();
    db = openDatabase(path);
    initializeDatabase(db);
    assert.equal(db.prepare("SELECT weekly_mileage_goal FROM users WHERE id = ?").get(alex.id).weekly_mileage_goal, 22);
    assert.equal(db.prepare("SELECT email FROM users WHERE id = ?").get(alex.id).email, "changed@example.com");
    initializeDatabase(db, { reset: true });
    assert.equal(db.prepare("SELECT email FROM users WHERE id = ?").get(alex.id).email, "alex@example.com");
    assert.equal(db.prepare("SELECT count(*) AS count FROM runs").get().count, 3);
  } finally {
    db?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("schema enforces unique emails, positive measurements, and run ownership", () => {
  const db = openDatabase(":memory:");
  try {
    initializeDatabase(db);
    assert.throws(() => db.prepare("UPDATE users SET email = 'ALEX@EXAMPLE.COM' WHERE email = 'sam@example.com'").run());
    assert.throws(() => db.prepare("UPDATE users SET age = 0 WHERE id = 1").run());
    assert.throws(() => db.prepare("UPDATE users SET height_inches = 0 WHERE id = 1").run());
    assert.throws(() => db.prepare("INSERT INTO runs (user_id, run_date, distance_miles) VALUES (999, '2026-10-03', 3)").run());
    assert.throws(() => db.prepare("INSERT INTO runs (user_id, run_date, distance_miles) VALUES (1, 'not-a-date', 3)").run());
    db.prepare("DELETE FROM users WHERE email = 'alex@example.com'").run();
    assert.equal(db.prepare("SELECT count(*) AS count FROM runs").get().count, 0);
  } finally { db.close(); }
});
