import { localDate } from "./runValidation.js";

function asDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date();
}

// Monday is the first day and Sunday is the last, matching the overview week.
export function weekBounds(today = new Date()) {
  const date = asDate(today);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7));
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { startDate: localDate(start), endDate: localDate(end), todayDate: localDate(date) };
}

export function eachDate(startDate, endDate) {
  const days = [];
  const cursor = asDate(startDate);
  const end = asDate(endDate);
  while (cursor <= end) {
    days.push(localDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
