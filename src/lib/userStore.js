const USERS_KEY = "running-coach:users";
const SESSION_KEY = "running-coach:session";

export const MEASUREMENT_MIN = 1;

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const users = raw ? JSON.parse(raw) : {};
    for (const user of Object.values(users)) {
      if (user.heightUnit !== "inches") {
        user.height = Math.round(Number(user.height) * 12 * 10) / 10;
        user.heightUnit = "inches";
      }
    }
    return users;
  } catch {
    return {};
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...profile } = user;
  return profile;
}

export function getSessionEmail() {
  return localStorage.getItem(SESSION_KEY);
}

export function setSession(email) {
  localStorage.setItem(SESSION_KEY, email);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser() {
  const email = getSessionEmail();
  if (!email) return null;
  const users = readUsers();
  return publicUser(users[email]);
}

export function registerUser({ name, email, password, age, height, weight }) {
  const normalizedName = typeof name === "string" ? name.trim() : "";
  if (!normalizedName) {
    return { ok: false, error: "Full name is required." };
  }

  const errors = validateMeasurements({ age, height, weight });
  if (Object.keys(errors).length > 0) {
    return { ok: false, error: Object.values(errors)[0] };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();

  if (users[normalizedEmail]) {
    return { ok: false, error: "An account with this email already exists." };
  }

  users[normalizedEmail] = {
    name: normalizedName,
    email: normalizedEmail,
    password,
    age: Number(age),
    height: Number(height),
    heightUnit: "inches",
    weight: Number(weight),
    weeklyMileageGoal: null,
  };
  writeUsers(users);
  setSession(normalizedEmail);
  return { ok: true, user: publicUser(users[normalizedEmail]) };
}

export function authenticateUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users[normalizedEmail];

  if (!user || user.password !== password) {
    return { ok: false, error: "Invalid email or password." };
  }

  setSession(normalizedEmail);
  return { ok: true, user: publicUser(user) };
}

export function updateCurrentUser(updates) {
  const email = getSessionEmail();
  if (!email) {
    return { ok: false, error: "You must be signed in." };
  }

  const users = readUsers();
  const user = users[email];
  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  users[email] = { ...user, ...updates, email: user.email, password: user.password };
  writeUsers(users);
  return { ok: true, user: publicUser(users[email]) };
}

function validateMeasurements({ age, height, weight }) {
  const errors = {};

  const ageNum = Number(age);
  if (!Number.isFinite(ageNum) || ageNum < 1 || !Number.isInteger(ageNum)) {
    errors.age = "Age must be a whole number of at least 1.";
  }

  const heightNum = Number(height);
  if (!Number.isFinite(heightNum) || heightNum < MEASUREMENT_MIN) {
    errors.height = `Height must be at least ${MEASUREMENT_MIN} inch.`;
  }

  const weightNum = Number(weight);
  if (!Number.isFinite(weightNum) || weightNum < MEASUREMENT_MIN) {
    errors.weight = `Weight must be at least ${MEASUREMENT_MIN} lb.`;
  }

  return errors;
}

export function validateProfileFields({ age, height, weight, weeklyMileageGoal }) {
  const errors = validateMeasurements({ age, height, weight });

  if (weeklyMileageGoal === "" || weeklyMileageGoal === null || weeklyMileageGoal === undefined) {
    errors.weeklyMileageGoal = "Weekly mileage goal is required.";
  } else {
    const goalNum = Number(weeklyMileageGoal);
    if (!Number.isFinite(goalNum) || goalNum <= 0) {
      errors.weeklyMileageGoal = "Weekly mileage goal must be a positive number.";
    }
  }

  return errors;
}
