-- Sample accounts use demo123. This shared hash is only for these test fixtures.
INSERT INTO users (name, email, password_hash, age, height_inches, weight_lb, weekly_mileage_goal)
VALUES
  ('Alex Runner', 'alex@example.com', 'scrypt:running-coach-demo:16afcbcc0e4e77949678274d283b1ca755c5d0b60d874ccda6b73f480fe6e2294d165a5a1af710ff708c73e1a60c3b20066b1ed9e0b588cd79100bf7eeb0825d', 25, 67, 145, 15),
  ('Sam Starter', 'sam@example.com', 'scrypt:running-coach-demo:16afcbcc0e4e77949678274d283b1ca755c5d0b60d874ccda6b73f480fe6e2294d165a5a1af710ff708c73e1a60c3b20066b1ed9e0b588cd79100bf7eeb0825d', 30, 70, 170, NULL);

INSERT INTO runs (user_id, run_date, distance_miles, duration_minutes, notes)
SELECT id, date('now', 'localtime'), 3, 30, 'Easy neighborhood run' FROM users WHERE email = 'alex@example.com';
INSERT INTO runs (user_id, run_date, distance_miles, duration_minutes, notes)
SELECT id, date('now', 'localtime', '-2 days'), 4, 42, 'Steady park run' FROM users WHERE email = 'alex@example.com';
INSERT INTO runs (user_id, run_date, distance_miles, duration_minutes, notes)
SELECT id, date('now', 'localtime', '-7 days'), 2, 22, 'Recovery run' FROM users WHERE email = 'alex@example.com';
