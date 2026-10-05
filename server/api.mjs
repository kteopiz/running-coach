import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "./passwords.mjs";
import { validateAccountFields, validateMeasurements, validateProfileFields } from "../src/lib/validation.js";

const SESSION_SECONDS = 7 * 24 * 60 * 60;
const publicColumns = `id, name, email, age, height_inches AS height,
  weight_lb AS weight, weekly_mileage_goal AS weeklyMileageGoal`;
const now = () => Math.floor(Date.now() / 1000);
const emailKey = (email) => typeof email === "string" ? email.trim().toLowerCase() : "";

function respond(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

async function readBody(req) {
  if (!req.headers["content-type"]?.startsWith("application/json")) fail("Send a JSON request.", 415);
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 16_384) fail("Request is too large.", 413);
  }
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) fail("Invalid request.");
    return body;
  } catch {
    fail("Invalid JSON request.");
  }
}

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function createApi(db) {
  const publicUser = (id) => db.prepare(`SELECT ${publicColumns} FROM users WHERE id = ?`).get(id);
  const tokenFrom = (req) => req.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith("running_coach_session="))?.slice("running_coach_session=".length);
  const sessionUser = (req) => {
    const token = tokenFrom(req);
    if (!token) return null;
    const session = db.prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?").get(token, now());
    return session ? publicUser(session.user_id) : null;
  };
  const startSession = (req, res, id) => {
    const oldToken = tokenFrom(req);
    if (oldToken) db.prepare("DELETE FROM sessions WHERE token = ?").run(oldToken);
    db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, id, now() + SESSION_SECONDS);
    res.setHeader("Set-Cookie", `running_coach_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_SECONDS}`);
  };

  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      const route = `${req.method} ${path}`;
      if (route === "GET /api/health") return respond(res, 200, { ok: true });
      if (route === "GET /api/session") return respond(res, 200, { ok: true, user: sessionUser(req) });
      if (route === "DELETE /api/session") {
        const token = tokenFrom(req);
        if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
        res.setHeader("Set-Cookie", "running_coach_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
        return respond(res, 200, { ok: true });
      }
      if (route === "POST /api/register") {
        const body = await readBody(req);
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) fail("Full name is required.");
        const accountError = validateAccountFields({ ...body, confirmPassword: body.password }, true);
        if (accountError) fail(accountError);
        const errors = validateMeasurements(body);
        if (Object.keys(errors).length) fail(Object.values(errors)[0]);
        const email = emailKey(body.email);
        if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) fail("An account with this email already exists.", 409);
        const inserted = db.prepare(`INSERT INTO users (name, email, password_hash, age, height_inches, weight_lb)
          VALUES (?, ?, ?, ?, ?, ?)`).run(name, email, hashPassword(body.password), Number(body.age), Number(body.height), Number(body.weight));
        const id = Number(inserted.lastInsertRowid);
        startSession(req, res, id);
        return respond(res, 201, { ok: true, user: publicUser(id) });
      }
      if (route === "POST /api/login") {
        const body = await readBody(req);
        const account = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(emailKey(body.email));
        if (!account || !verifyPassword(body.password, account.password_hash)) fail("Invalid email or password.", 401);
        startSession(req, res, account.id);
        return respond(res, 200, { ok: true, user: publicUser(account.id) });
      }
      if (route === "POST /api/reset-password") {
        const body = await readBody(req);
        const error = validateAccountFields(body, true);
        if (error) fail(error);
        const account = db.prepare("SELECT id FROM users WHERE email = ?").get(emailKey(body.email));
        if (!account) fail("No account found with this email.", 404);
        // Local project behavior: reset immediately without email verification.
        db.exec("BEGIN");
        try {
          db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(body.password), account.id);
          db.prepare("DELETE FROM sessions WHERE user_id = ?").run(account.id);
          db.exec("COMMIT");
        } catch (error) { db.exec("ROLLBACK"); throw error; }
        return respond(res, 200, { ok: true });
      }
      if (!["PATCH /api/profile", "PATCH /api/account", "GET /api/runs"].includes(route)) fail("Endpoint not found.", 404);
      const user = sessionUser(req);
      if (!user) fail("You must be signed in.", 401);
      if (route === "PATCH /api/profile") {
        const body = await readBody(req);
        const errors = validateProfileFields(body);
        if (Object.keys(errors).length) fail(Object.values(errors)[0]);
        db.prepare("UPDATE users SET age = ?, height_inches = ?, weight_lb = ?, weekly_mileage_goal = ? WHERE id = ?")
          .run(Number(body.age), Number(body.height), Number(body.weight), Number(body.weeklyMileageGoal), user.id);
        return respond(res, 200, { ok: true, user: publicUser(user.id) });
      }
      if (route === "PATCH /api/account") {
        const body = await readBody(req);
        const password = body.password ?? "";
        const error = validateAccountFields({ ...body, password, confirmPassword: body.confirmPassword ?? "" }, false);
        if (error) fail(error);
        const email = emailKey(body.email);
        const duplicate = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, user.id);
        if (duplicate) fail("An account with this email already exists.", 409);
        if (password) {
          db.prepare("UPDATE users SET email = ?, password_hash = ? WHERE id = ?").run(email, hashPassword(password), user.id);
        } else {
          db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email, user.id);
        }
        return respond(res, 200, { ok: true, user: publicUser(user.id) });
      }
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
      const runs = db.prepare(`SELECT id, run_date AS date, distance_miles AS distanceMiles,
        duration_minutes AS durationMinutes, notes FROM runs WHERE user_id = ? ORDER BY run_date DESC, id DESC LIMIT 5`).all(user.id);
      const { total } = db.prepare("SELECT COALESCE(SUM(distance_miles), 0) AS total FROM runs WHERE user_id = ? AND run_date >= ? AND run_date <= ?")
        .get(user.id, localDate(monday), localDate(today));
      return respond(res, 200, { ok: true, runs, weeklyMiles: Math.round(total * 10) / 10 });
    } catch (error) {
      if (!error.status) console.error(error);
      respond(res, error.status || 500, { ok: false, error: error.status ? error.message : "The local server could not complete the request." });
    }
  });
}
