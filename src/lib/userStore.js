const USERS_KEY = "running-coach:users";
const SESSION_KEY = "running-coach:session";

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
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
  return users[email] ?? null;
}

export function registerUser({ name, email, password, age, height, weight }) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();

  if (users[normalizedEmail]) {
    return { ok: false, error: "An account with this email already exists." };
  }

  users[normalizedEmail] = {
    name: name.trim(),
    email: normalizedEmail,
    password,
    age: Number(age),
    height: Number(height),
    weight: Number(weight),
    weeklyMileageGoal: null,
  };
  writeUsers(users);
  setSession(normalizedEmail);
  return { ok: true, user: users[normalizedEmail] };
}

export function authenticateUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const users = readUsers();
  const user = users[normalizedEmail];

  if (!user || user.password !== password) {
    return { ok: false, error: "Invalid email or password." };
  }

  setSession(normalizedEmail);
  return { ok: true, user };
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
  return { ok: true, user: users[email] };
}

export function validateProfileFields({ age, height, weight, weeklyMileageGoal }) {
  const errors = {};

  const ageNum = Number(age);
  if (!Number.isFinite(ageNum) || ageNum < 1 || !Number.isInteger(ageNum)) {
    errors.age = "Age must be a whole number of at least 1.";
  }

  const heightNum = Number(height);
  if (!Number.isFinite(heightNum) || heightNum <= 0) {
    errors.height = "Height must be a positive number.";
  }

  const weightNum = Number(weight);
  if (!Number.isFinite(weightNum) || weightNum <= 0) {
    errors.weight = "Weight must be a positive number.";
  }

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
