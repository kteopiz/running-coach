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
- `npm test`: run the automated tests covering persistence, schema constraints, accounts, run CRUD/ownership/validation, weekly progress, and the calorie estimate.
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

Implementation verification: all five automated tests and the production build
passed. Browser interaction checks remain pending because no browser was
available to the automation environment. No failing automated checks remain.

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
