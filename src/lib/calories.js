import { INPUT_LIMITS } from "./validation.js";

// Profile and activity inputs for the educational daily calorie estimate.
// Age, height, and weight come from the runner profile. Weekly mileage is the running goal.
export const CALORIE_INPUTS = {
  minAge: INPUT_LIMITS.minAge,
  maxAge: INPUT_LIMITS.maxAge,
  minHeightInches: INPUT_LIMITS.minHeightInches,
  maxHeightInches: INPUT_LIMITS.maxHeightInches,
  minWeightLb: INPUT_LIMITS.minWeightLb,
  maxWeightLb: INPUT_LIMITS.maxWeightLb,
  minWeeklyMiles: INPUT_LIMITS.minWeeklyMiles,
  maxWeeklyMiles: INPUT_LIMITS.maxWeeklyMiles,
  minGoalCalories: INPUT_LIMITS.minGoalCalories,
  maxGoalCalories: INPUT_LIMITS.maxGoalCalories,
};

const POUNDS_PER_KILOGRAM = 2.2046226218;
const CENTIMETERS_PER_INCH = 2.54;
// Midpoint of the Mifflin-St Jeor constants for male (+5) and female (-161).
const RESTING_ADJUSTMENT = -78;
const CALORIES_PER_POUND_MILE = 0.63;

export const CALORIE_ESTIMATE_NOTE =
  "Educational estimate from age, height, weight, and weekly running goal. This is not a target and it is not medical advice.";
export const CALORIE_ESTIMATE_UNAVAILABLE =
  "Those values are outside the range this educational estimate can use. Age is 10 to 100, height is 36 to 96 inches, weight is 50 to 400 lb, and the weekly goal is 0.1 to 100 miles.";

export function calorieInputs({ age, heightInches, height, weightLb, weight, weeklyMileageGoal } = {}) {
  const ageNum = Number(age);
  const heightNum = Number(heightInches ?? height);
  const weightNum = Number(weightLb ?? weight);
  const miles = Number(weeklyMileageGoal);
  const valid =
    Number.isInteger(ageNum) && ageNum >= CALORIE_INPUTS.minAge && ageNum <= CALORIE_INPUTS.maxAge &&
    Number.isFinite(heightNum) && heightNum >= CALORIE_INPUTS.minHeightInches && heightNum <= CALORIE_INPUTS.maxHeightInches &&
    Number.isFinite(weightNum) && weightNum >= CALORIE_INPUTS.minWeightLb && weightNum <= CALORIE_INPUTS.maxWeightLb &&
    Number.isFinite(miles) && miles >= CALORIE_INPUTS.minWeeklyMiles && miles <= CALORIE_INPUTS.maxWeeklyMiles;
  if (!valid) return null;
  return { age: ageNum, heightInches: heightNum, weightLb: weightNum, weeklyMileageGoal: miles };
}

export function estimateDailyCalories(profile) {
  const inputs = calorieInputs(profile);
  if (!inputs) return null;
  const kilograms = inputs.weightLb / POUNDS_PER_KILOGRAM;
  const centimeters = inputs.heightInches * CENTIMETERS_PER_INCH;
  const restingCalories = Math.round(10 * kilograms + 6.25 * centimeters - 5 * inputs.age + RESTING_ADJUSTMENT);
  const runningCalories = Math.round((inputs.weeklyMileageGoal * inputs.weightLb * CALORIES_PER_POUND_MILE) / 7);
  return {
    calories: restingCalories + runningCalories,
    restingCalories,
    runningCalories,
    inputs,
    label: "Educational estimate",
  };
}

export function validateCalorieGoal({ effectiveDate, calories }) {
  const errors = {};
  const parsed = typeof effectiveDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
    ? new Date(`${effectiveDate}T00:00:00Z`) : null;
  if (!parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== effectiveDate) {
    errors.effectiveDate = "Enter a valid date.";
  }
  const caloriesNum = Number(calories);
  if (!Number.isInteger(caloriesNum) || caloriesNum < CALORIE_INPUTS.minGoalCalories || caloriesNum > CALORIE_INPUTS.maxGoalCalories) {
    errors.calories = `Calorie goal must be a whole number from ${CALORIE_INPUTS.minGoalCalories} to ${CALORIE_INPUTS.maxGoalCalories}.`;
  }
  return errors;
}

function isGoalDate(date) {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// The goal in effect on a date is the latest entry dated on or before that day.
export function calorieGoalOn(goals, date) {
  if (!isGoalDate(date)) return null;
  let match = null;
  for (const goal of Array.isArray(goals) ? goals : []) {
    if (goal?.effectiveDate <= date && (!match || goal.effectiveDate > match.effectiveDate)) match = goal;
  }
  return match;
}

// The next saved goal after a date has not started yet.
export function upcomingCalorieGoal(goals, date) {
  if (!isGoalDate(date)) return null;
  let match = null;
  for (const goal of Array.isArray(goals) ? goals : []) {
    if (goal?.effectiveDate > date && (!match || goal.effectiveDate < match.effectiveDate)) match = goal;
  }
  return match;
}
