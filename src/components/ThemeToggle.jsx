import { useState } from "react";

const STORAGE_KEY = "running-coach-theme";

export function initializeTheme() {
  let theme = "dark";
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") theme = saved;
  } catch {
    // Theme switching still works when browser storage is unavailable.
  }
  document.documentElement.dataset.theme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "dark");

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Keep the chosen theme for this page even if it cannot be saved.
    }
  }

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme}
      aria-label="Dark mode" aria-pressed={theme === "dark"}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
