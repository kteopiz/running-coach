CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 1),
  height_inches REAL NOT NULL CHECK (height_inches >= 1),
  weight_lb REAL NOT NULL CHECK (weight_lb >= 1),
  weekly_mileage_goal REAL CHECK (weekly_mileage_goal > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_date TEXT NOT NULL CHECK (date(run_date) IS NOT NULL AND date(run_date) = run_date),
  distance_miles REAL NOT NULL CHECK (distance_miles > 0),
  duration_minutes REAL CHECK (duration_minutes > 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS runs_user_date ON runs(user_id, run_date);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
