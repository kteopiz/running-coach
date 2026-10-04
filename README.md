# running-coach
school project for cps714

## Local database

Use Node.js 22.13+ (`nvm install` and `nvm use`). SQLite is bundled with Node.
Run `npm ci` to install frontend dependencies, then `npm run db:setup` to create
`data/local.sqlite` using `db/schema.sql` and `db/seed.sql`.

Sample accounts are alex@example.com and sam@example.com, both with password demo123.
Repeating database setup preserves local data. `npm run db:reset` restores fixtures
after confirmation; stop the app before resetting. The local database is ignored
by Git, so teammates have independent data. `npm test` checks database setup and constraints.

The users table stores profiles and hashed passwords. Runs reference their owner
by user ID and store dates, distances, durations, and notes. Sessions reference
users by ID and store sign-in tokens and expiry times.
