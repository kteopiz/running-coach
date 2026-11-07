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

export function calorieProgress(meals, goalCalories, date) {
  const consumedCalories = meals
    .filter((meal) => meal.date === date)
    .reduce((sum, meal) => sum + Number(meal.calories), 0);
  const goal = Number(goalCalories);
  const hasGoal = Number.isInteger(goal) && goal >= 1 && goal <= 10000;
  if (!hasGoal) {
    return { consumedCalories, goalCalories: null, remainingCalories: null, overCalories: 0, status: "no-goal" };
  }
  const overCalories = Math.max(0, consumedCalories - goal);
  return {
    consumedCalories,
    goalCalories: goal,
    remainingCalories: Math.max(0, goal - consumedCalories),
    overCalories,
    status: overCalories > 0 ? "over-goal" : consumedCalories === goal ? "complete" : "in-progress",
  };
}
