import { localDate } from "./runValidation.js";
import { weekBounds as recommendationBounds } from "./recommendation.js";

function asDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date();
}

function todayDate(today) {
  if (typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)) return today;
  return localDate(today instanceof Date ? today : new Date());
}

// Sunday is the first day and Saturday is the last, matching the overview week.
export function weekBounds(today = new Date()) {
  const bounds = recommendationBounds(today);
  return { startDate: bounds.startDate, endDate: bounds.endDate, todayDate: todayDate(today) };
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
