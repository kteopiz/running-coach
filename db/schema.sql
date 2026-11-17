CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 10 AND age <= 100),
  height_inches REAL NOT NULL CHECK (height_inches >= 36 AND height_inches <= 96),
  weight_lb REAL NOT NULL CHECK (weight_lb >= 50 AND weight_lb <= 400),
  weekly_mileage_goal REAL CHECK (weekly_mileage_goal >= 0.1 AND weekly_mileage_goal <= 100),
  daily_calorie_goal INTEGER CHECK (daily_calorie_goal >= 1 AND daily_calorie_goal <= 10000),
  unit_system TEXT NOT NULL DEFAULT 'imperial' CHECK (unit_system IN ('imperial', 'metric')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  run_date TEXT NOT NULL CHECK (date(run_date) IS NOT NULL AND date(run_date) = run_date),
  start_time TEXT CHECK (start_time IS NULL OR (length(start_time) = 5 AND start_time GLOB '[0-2][0-9]:[0-5][0-9]' AND start_time <= '23:59')),
  distance_miles REAL NOT NULL CHECK (distance_miles >= 0.1 AND distance_miles <= 100),
  duration_minutes REAL CHECK (duration_minutes > 0),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS runs_user_date ON runs(user_id, run_date);

CREATE TABLE IF NOT EXISTS calorie_goals (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  effective_date TEXT NOT NULL CHECK (date(effective_date) IS NOT NULL AND date(effective_date) = effective_date),
  calories INTEGER CHECK (calories >= 1 AND calories <= 10000),
  age INTEGER NOT NULL CHECK (age >= 10 AND age <= 100),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS calorie_goals_user_date ON calorie_goals(user_id, effective_date);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_date TEXT NOT NULL CHECK (date(meal_date) IS NOT NULL AND date(meal_date) = meal_date),
  meal_time TEXT NOT NULL CHECK (length(meal_time) = 5 AND meal_time GLOB '[0-2][0-9]:[0-5][0-9]' AND meal_time <= '23:59'),
  kind TEXT NOT NULL CHECK (kind IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0 AND length(description) <= 200),
  calories INTEGER NOT NULL CHECK (calories >= 1 AND calories <= 10000),
  weight_lb REAL NOT NULL CHECK (weight_lb >= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX IF NOT EXISTS meals_user_date ON meals(user_id, meal_date);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

-- Existing databases keep their original checks. These triggers reject new writes
-- outside the form limits without rewriting a row that was already outside them.
CREATE TRIGGER IF NOT EXISTS users_insert_bounds
BEFORE INSERT ON users
WHEN NEW.age < 10 OR NEW.age > 100
  OR NEW.height_inches < 36 OR NEW.height_inches > 96
  OR NEW.weight_lb < 50 OR NEW.weight_lb > 400
  OR (NEW.weekly_mileage_goal IS NOT NULL AND (NEW.weekly_mileage_goal < 0.1 OR NEW.weekly_mileage_goal > 100))
BEGIN
  SELECT RAISE(ABORT, 'profile value is outside the allowed range');
END;

CREATE TRIGGER IF NOT EXISTS users_update_bounds
BEFORE UPDATE ON users
WHEN ((NEW.age < 10 OR NEW.age > 100) AND OLD.age >= 10 AND OLD.age <= 100)
  OR ((NEW.height_inches < 36 OR NEW.height_inches > 96) AND OLD.height_inches >= 36 AND OLD.height_inches <= 96)
  OR ((NEW.weight_lb < 50 OR NEW.weight_lb > 400) AND OLD.weight_lb >= 50 AND OLD.weight_lb <= 400)
  OR (
    NEW.weekly_mileage_goal IS NOT NULL AND (NEW.weekly_mileage_goal < 0.1 OR NEW.weekly_mileage_goal > 100)
    AND (OLD.weekly_mileage_goal IS NULL OR (OLD.weekly_mileage_goal >= 0.1 AND OLD.weekly_mileage_goal <= 100))
  )
BEGIN
  SELECT RAISE(ABORT, 'profile value is outside the allowed range');
END;

CREATE TRIGGER IF NOT EXISTS runs_insert_bounds
BEFORE INSERT ON runs
WHEN NEW.distance_miles < 0.1 OR NEW.distance_miles > 100
BEGIN
  SELECT RAISE(ABORT, 'distance is outside the allowed range');
END;

CREATE TRIGGER IF NOT EXISTS runs_update_bounds
BEFORE UPDATE ON runs
WHEN (NEW.distance_miles < 0.1 OR NEW.distance_miles > 100)
  AND OLD.distance_miles >= 0.1 AND OLD.distance_miles <= 100
BEGIN
  SELECT RAISE(ABORT, 'distance is outside the allowed range');
END;

CREATE TRIGGER IF NOT EXISTS calorie_goals_insert_bounds
BEFORE INSERT ON calorie_goals
WHEN NEW.age < 10 OR NEW.age > 100
BEGIN
  SELECT RAISE(ABORT, 'calorie goal age is outside the allowed range');
END;
