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
- `npm test`: check setup persistence, schema constraints, and account/API behavior using temporary databases.
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
| duration_minutes | REAL, optional | Positive duration in minutes |
| notes | TEXT | Description; defaults to an empty string |
| created_at | TEXT, required | UTC creation timestamp, filled automatically |

Runs are indexed by owner and date. Sample runs are stored for testing, and the
API supports reading recent runs and weekly mileage. Displaying runs on the
dashboard and a form for creating new runs are deferred to a later feature.

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
