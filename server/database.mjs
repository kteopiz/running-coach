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
    if (reset) db.exec("DROP TABLE IF EXISTS sessions; DROP TABLE IF EXISTS runs; DROP TABLE IF EXISTS users;");
    const existing = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
    db.exec(readFileSync(resolve(root, "db/schema.sql"), "utf8"));
    // Seed once, even if a teammate later edits or removes the sample accounts.
    if (!existing) db.exec(readFileSync(resolve(root, "db/seed.sql"), "utf8"));
    db.exec("COMMIT");
    return !existing;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
