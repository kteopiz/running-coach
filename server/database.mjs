import { localDate } from "../src/lib/runValidation.js";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const databasePath = resolve(root, process.env.RUNNING_COACH_DB || "data/local.sqlite");

export function openDatabase(path = databasePath) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  return db;
}

export function initializeDatabase(db, { reset = false } = {}) {
  db.exec("BEGIN IMMEDIATE");
  try {
    if (reset) db.exec("DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS meals; DROP TABLE IF EXISTS calorie_goals; DROP TABLE IF EXISTS runs; DROP TABLE IF EXISTS users;");
    const existing = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
    db.exec(readFileSync(resolve(root, "db/schema.sql"), "utf8"));
    const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
    if (!userColumns.includes("daily_calorie_goal")) {
      db.exec("ALTER TABLE users ADD COLUMN daily_calorie_goal INTEGER");
    }
    // Allow a dated clearing entry, and reconcile the former independent profile goal once.
    const calorieColumns = db.prepare("PRAGMA table_info(calorie_goals)").all();
    const legacyGoalStorage = Boolean(calorieColumns.find((column) => column.name === "calories")?.notnull);
    const uniqueGoalDate = db.prepare("PRAGMA index_list(calorie_goals)").all().some((index) => index.origin === "u");
    if (legacyGoalStorage || uniqueGoalDate) {
      db.exec(`ALTER TABLE calorie_goals RENAME TO legacy_calorie_goals;
        DROP INDEX calorie_goals_user_date;`);
      db.exec(readFileSync(resolve(root, "db/schema.sql"), "utf8"));
      db.exec(`INSERT INTO calorie_goals SELECT * FROM legacy_calorie_goals;
        DROP TABLE legacy_calorie_goals;`);
      if (legacyGoalStorage) db.prepare(`INSERT INTO calorie_goals (user_id, effective_date, calories, age)
        SELECT id, ?, daily_calorie_goal, age FROM users WHERE daily_calorie_goal IS NOT NULL`)
        .run(localDate());
    }
    if (!userColumns.includes("unit_system")) {
      db.exec("ALTER TABLE users ADD COLUMN unit_system TEXT NOT NULL DEFAULT 'imperial'");
    }
    const runColumns = db.prepare("PRAGMA table_info(runs)").all().map((column) => column.name);
    if (runColumns.length && !runColumns.includes("start_time")) {
      db.exec(`ALTER TABLE runs ADD COLUMN start_time TEXT CHECK (
        start_time IS NULL OR (length(start_time) = 5 AND start_time GLOB '[0-2][0-9]:[0-5][0-9]' AND start_time <= '23:59')
      )`);
    }
    // Seed once, even if a teammate later edits or removes the sample accounts.
    if (!existing) db.exec(readFileSync(resolve(root, "db/seed.sql"), "utf8"));
    db.exec("COMMIT");
    return !existing;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
