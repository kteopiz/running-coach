# running-coach
school project for cps714

## Run locally

Install Node.js **22.13 or newer**. If you use nvm, run `nvm install` and `nvm use`
in this folder. SQLite is bundled with Node; no separate SQLite installation or
Docker is needed.

From the project folder, run:

```sh
npm run setup
```

This installs the lockfile dependencies, creates `data/local.sqlite` with sample
data on first use, and starts the frontend and local API. Open
**http://127.0.0.1:5174**, or the next available port printed by Vite if 5174 is
already occupied. Stop both servers with Ctrl+C.

On subsequent visits, `npm run dev` starts both servers without reinstalling
dependencies. Repeating setup preserves existing accounts, passwords, goals, and
runs. The API listens on `127.0.0.1:3001`; Vite forwards `/api` requests to it.

Sample accounts (both use password **demo123**):

| Email | Sample data |
| --- | --- |
| alex@example.com | Profile, 15-mile weekly goal, and three recent runs |
| sam@example.com | Profile with no weekly goal or runs |

Seed run dates are relative to the date the database is created. Weekly totals
use Monday through Sunday in the server computer's local time.

## Database commands

- `npm run db:setup`: initialize the database without starting the app; preserve existing data.
- `npm run db:reset`: delete local data and restore sample data after you type `RESET` at the prompt. Stop the app before resetting.
- `npm test`: run the automated tests covering persistence, schema constraints, accounts, run CRUD/ownership/validation, weekly progress, recommendations, meal logging, daily calorie progress, the calorie estimate, and calorie-goal history using temporary databases.
- `npm run build`: build the React frontend. Previewing that build alone does not start the API; use `npm run dev` for the complete local app.

The shared schema and fixtures belong in Git. `data/` is ignored so each teammate
has an independent working database. Setup only seeds a newly initialized
database, so changes to `db/seed.sql` require a deliberate reset to apply locally.
Future table changes should be added as migrations; `CREATE TABLE IF NOT EXISTS`
does not change the columns of existing tables.

## Tables

Definitions live in `db/schema.sql`; sample data lives in `db/seed.sql`.

### users

| Column | Type | Meaning |
| --- | --- | --- |
| id | INTEGER, primary key | Stable account identifier; email changes preserve relationships |
| name | TEXT, required | Nonblank display name |
| email | TEXT, required, unique | Case-insensitive account email |
| password_hash | TEXT, required | Salted scrypt password hash; never sent to the UI |
| age | INTEGER, required | Age, at least 1 |
| height_inches | REAL, required | Height in inches, at least 1 |
| weight_lb | REAL, required | Weight in pounds, at least 1 |
| weekly_mileage_goal | REAL, optional | Positive weekly mileage goal; NULL means unset |
| created_at | TEXT, required | UTC creation timestamp, filled automatically |

### runs

| Column | Type | Meaning |
| --- | --- | --- |
| id | INTEGER, primary key | Run identifier |
| user_id | INTEGER, foreign key | Owner in users; deleting the owner deletes their runs |
| run_date | TEXT, required | Calendar date in YYYY-MM-DD format |
| distance_miles | REAL, required | Positive distance in miles |
| duration_minutes | REAL, nullable for legacy records | Positive duration in minutes; required when creating or editing through the API |
| notes | TEXT | Description; defaults to an empty string |
| created_at | TEXT, required | UTC creation timestamp, filled automatically |

Runs are indexed by owner and date. The dashboard shows all of the signed-in
user's runs, newest date first (newest ID first for matching dates), with date,
distance, and duration. Log a run, edit a prefilled entry, or confirm deletion
from Run history. Successful changes reload both history and weekly progress.
Empty history, loading, request errors, and retry are supported.

Run date, distance in miles, and duration in minutes are required. Dates must be
real YYYY-MM-DD calendar dates and cannot be in the future. Distance and duration
must be finite positive numbers; decimals are supported. Both the form and API
validate these rules. The server's local calendar date is authoritative.
Older database records with no duration remain readable as “Not recorded”; editing
one requires a duration. No schema migration or database reset is needed.

### Run API

All run endpoints require the session cookie. The server chooses the owner from
the session, ignoring client-supplied ownership fields.

| Method and path | Behavior |
| --- | --- |
| `GET /api/runs` | All owned runs and `weeklyMiles` (Monday through today, inclusive) |
| `POST /api/runs` | Create with `{ date, distanceMiles, durationMinutes }`; returns 201 and `run` |
| `PATCH /api/runs/:id` | Update all three required fields; returns 200 and `run` |
| `DELETE /api/runs/:id` | Delete the owned run; returns 200 |

Validation returns 400 with field `errors`; signed-out requests return 401.
Missing runs and another user's runs both return 404 on update/delete. Existing
notes are preserved when editing. History is unpaginated for this sprint.
Weekly remaining mileage is clamped to zero; exceeding the goal shows the extra
distance, while the progress bar stops at 100%.

## Today's recommendation

The dashboard suggests one distance for today from the signed-in runner's weekly
goal and the miles already completed this week (Monday through today). The rules
live in `src/lib/recommendation.js` and do not use age, height, or weight.

### TS-05 inputs and outputs

`recommendToday` accepts `goalMiles`, `completedMiles` (default 0), `runDates`
(default empty), `today` (default the local current date), and optional `daysLeft`.
Use validated YYYY-MM-DD run dates and a valid Date or YYYY-MM-DD value for
`today`. Supply `today` explicitly for reproducible tests. The dashboard supplies
all run dates and the API's Monday-through-today total. Age, height, and weight
are not inputs.

A missing, nonfinite, or nonpositive goal produces no recommendation. Negative
or nonfinite completed mileage counts as zero. Days left are derived from the
local calendar (Monday 7, Sunday 1), or a supplied finite value is truncated and
clamped to 1–7. Only distinct run dates from Monday through today count toward
recovery; duplicates, earlier weeks, and future dates do not count.

Outputs include `todayMiles`, `remainingMiles`, `daysLeft`, `ranToday`, a `status`
(`no-goal`, `suggested`, `reduced`, or `rest`), and an explanatory `message`.
Missing goals return null distances; rest returns zero today miles.

### Rule priority and precision

Rules are centralized in `src/lib/recommendation.js` and applied in this order:

1. No valid goal: ask the runner to set one.
2. Goal met or exceeded: recommend rest, with zero remaining miles.
3. Three distinct run days this week: recommend rest even with miles remaining.
   These days do not have to be consecutive.
4. Otherwise split the remaining miles across days left, including today. Bound
   the suggestion by 6 miles, 25% of the goal, and actual remaining miles.
5. Round the suggestion to tenths, rounding down when needed to respect those
   bounds. A 15-mile goal has an exact 3.75-mile cap, so at most 3.7 miles is
   suggested. If a run is already logged today, halve the bounded suggestion
   and round to tenths again.
6. A zero suggestion means rest. A tiny positive remainder does not mean the
   weekly goal is complete; the message distinguishes this case.

The API preserves weekly totals without rounding to tenths. Remaining mileage
is `max(0, goal - completed)`, shared by weekly progress and the coach. Calculations
use JavaScript numbers; display rounding does not determine completion. Positive
dashboard distances below 0.1 display as `<0.1`, and an incomplete goal never
shows 100%. Logging, editing, or deleting a run reloads activity and recalculates
the recommendation while existing content remains visible.

### Sprint 3 / TS-05 verification

- Focused checks: `node --test tests/recommendation.test.mjs tests/sprint3.test.mjs`
  passed all 12 tests. Coverage includes no runs, partial/completed goals,
  representative run changes, recovery days, fractional caps, tiny remainders,
  and duplicate/out-of-week dates.
- `npm run build` passed.
- Full suite: run `npm test`. New API/progress regressions cover a 14.96-mile
  total against a 15-mile goal, exact completion after editing, deletion, and
  small goals. Full-suite execution is pending user verification.
- Browser acceptance remains pending: create, edit, delete, and move runs between
  weeks; verify refreshed totals and guidance. Check rest/reduced messages,
  unset goals, and `<0.1` remaining without premature completion.

## Sprint 2 acceptance checks

Automated: `npm test` and `npm run build`. The focused run API test covers real
create/update/delete requests, missing/non-numeric/nonpositive inputs, invalid
and future dates, signed-out and cross-user access, full history ordering,
Monday/previous-Sunday boundaries, and totals after date/distance changes and
deletion. A small progress test covers unset, incomplete, met, and exceeded goals.
The database test also verifies run persistence after closing and reopening.

Browser review checklist (use sample accounts or a disposable local database):

1. Sign in as Sam; confirm empty history, zero completed mileage, and no goal.
2. Log today's run with 3 miles and 30 minutes; confirm the history entry and
   completed mileage update without reloading the page.
3. Open Edit; confirm fields are prefilled. Cancel once, then save 4 miles and
   40 minutes; verify both history and progress. Try blank/zero values and check
   the field errors; cancel should leave the stored entry unchanged.
4. Cancel a delete confirmation and verify the entry remains. Confirm deletion
   and verify the entry disappears and completed mileage returns to zero.
5. Set a goal, log enough mileage to meet/exceed it, and confirm remaining is zero.
6. Reload to verify persistence; sign in as Alex to verify separate history.

Historical Sprint 2 verification: its five automated tests and production build
passed at that time. Browser interaction checks remained pending. See the
Sprint 3 / TS-05 section above for current verification status.

### meals

| Column | Type | Meaning |
| --- | --- | --- |
| id | INTEGER, primary key | Meal identifier |
| user_id | INTEGER, foreign key | Owner in users; deleting the owner deletes their meals |
| meal_date | TEXT, required | Selected calendar date in YYYY-MM-DD format |
| meal_time | TEXT, required | Time of day as HH:MM, from 00:00 through 23:59 |
| kind | TEXT, required | breakfast, lunch, dinner, or snack |
| description | TEXT, required | What was eaten, 1 to 200 characters |
| calories | INTEGER, required | Whole-number calories from 1 to 10000 |
| weight_lb | REAL, required | Profile weight in pounds copied when the meal is logged |
| created_at | TEXT, required | UTC creation timestamp, filled automatically |

Meals are indexed by owner and date. The overview shows meals for one selected date, with consumed calories, the daily calorie goal, and remaining calories. Logging, editing, and deleting reload that date. Weight is copied from the profile at create time and is not edited with the meal. Changing the profile weight later does not rewrite older meals.

`users.daily_calorie_goal` is an optional whole number from 1 to 10000. It is the current daily target used for remaining calories. Blank clears it. Existing databases gain this column on startup; a reset is not required. This is one current goal, not a history of goals by date.

### Meal API

All meal endpoints require the session cookie. The server chooses the owner and the stored weight from the session.

| Method and path | Behavior |
| --- | --- |
| `GET /api/meals` | All meals owned by the signed-in user |
| `POST /api/meals` | Create with `{ date, time, kind, description, calories }`; returns 201 and `meal` |
| `PATCH /api/meals/:id` | Update those fields for an owned meal; weight stays as first logged |
| `DELETE /api/meals/:id` | Delete the owned meal; returns 200 |

Validation returns 400 with field `errors`. Signed-out requests return 401. Missing meals and another user's meals return 404. Dates must be real and cannot be in the future. Consumed calories are the sum for the selected date. Remaining is the daily goal minus consumed, and it does not drop below zero. Going over the goal shows the extra calories separately. With no daily goal, remaining is unset.

### calorie_goals

Each row is one calorie goal for one runner on one date. Saving the same date again updates that row. The goal in effect on a later day is the latest row dated on or before that day. `age` is the profile age at the time the goal was saved.

| Column | Type | Meaning |
| --- | --- | --- |
| id | INTEGER, primary key | Goal entry identifier |
| user_id | INTEGER, foreign key | Owner in users; deleting the owner deletes their goals |
| effective_date | TEXT, required | Calendar date in YYYY-MM-DD format; unique per runner |
| calories | INTEGER, required | Whole-number daily calorie goal from 1 to 10000 |
| age | INTEGER, required | Profile age saved with this goal |
| created_at | TEXT, required | UTC creation timestamp, filled automatically |

`GET /api/calorie-goals` lists the signed-in runner's goals, newest date first. `POST /api/calorie-goals` with `{ effectiveDate, calories }` adds or updates that date. The daily calorie number on the overview is a separate educational estimate. It is calculated from age, height, weight, and the weekly mileage goal. It is not stored as a calorie goal.

### sessions

| Column | Type | Meaning |
| --- | --- | --- |
| token | TEXT, primary key | Random sign-in token, kept in an HttpOnly browser cookie |
| user_id | INTEGER, foreign key | Signed-in account; deleting the account deletes its sessions |
| expires_at | INTEGER, required | Expiry as Unix seconds; sessions last seven days |

Session expiry is indexed. Sessions use the stable user ID, so changing an email
keeps the user signed in. Signing out removes the session.

## Account behavior

Profile → Account details lets users change email and/or password. Leave both
password fields blank to change only email. Duplicate emails are rejected.

Forgot password resets an existing account immediately with an email and matching
new password, without verification, as intended for this local project. Resetting
a password clears the account's existing sessions.

Accounts now live in SQLite rather than browser localStorage. Existing browser
accounts are not imported automatically; use the sample accounts or register again.
