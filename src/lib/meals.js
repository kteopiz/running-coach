import { localDate } from "./runValidation.js";

export const MEAL_KINDS = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["dinner", "Dinner"],
  ["snack", "Snack"],
];

function isRealDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function validateMealFields(fields, today = localDate()) {
  const errors = {};
  if (!isRealDate(fields.date)) errors.date = "Enter a valid meal date.";
  else if (fields.date > today) errors.date = "A meal cannot be dated in the future.";
  if (typeof fields.time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.time)) {
    errors.time = "Enter the time of the meal.";
  }
  if (!MEAL_KINDS.some(([kind]) => kind === fields.kind)) errors.kind = "Choose a meal type.";
  const description = typeof fields.description === "string" ? fields.description.trim() : "";
  if (!description) errors.description = "Enter a meal description.";
  else if (description.length > 200) errors.description = "Meal description must be 200 characters or fewer.";
  const calories = Number(fields.calories);
  if ((typeof fields.calories !== "number" && typeof fields.calories !== "string") || !Number.isInteger(calories) || calories < 1 || calories > 10000) {
    errors.calories = "Calories must be a whole number from 1 to 10000.";
  }
  return errors;
}
