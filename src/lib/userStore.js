export { MEASUREMENT_MIN, validateProfileFields } from "./validation";

async function request(path, method = "GET", body) {
  try {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok && result.ok !== false) {
      return { ok: false, error: "The request failed. Please try again." };
    }
    return result;
  } catch {
    return { ok: false, error: "Cannot reach the local server. Start the app with npm run setup or npm run dev." };
  }
}

export const getCurrentUser = () => request("/session");
export const clearSession = () => request("/session", "DELETE");
export const registerUser = (fields) => request("/register", "POST", fields);
export const authenticateUser = (email, password) => request("/login", "POST", { email, password });
export const updateCurrentUser = (fields) => request("/profile", "PATCH", fields);
export const updateCurrentAccount = (fields) => request("/account", "PATCH", fields);
export const resetPassword = (fields) => request("/reset-password", "POST", fields);
