// Profile and activity inputs for the educational daily calorie estimate.
// Age, height, and weight come from the runner profile. Weekly mileage is the running goal.
export const CALORIE_INPUTS = {
  minAge: 1,
  minHeightInches: 1,
  minWeightLb: 1,
  minWeeklyMiles: 0,
  minGoalCalories: 1,
  maxGoalCalories: 10000,
};

const POUNDS_PER_KILOGRAM = 2.2046226218;
const CENTIMETERS_PER_INCH = 2.54;
// Midpoint of the Mifflin-St Jeor constants for male (+5) and female (-161).
const RESTING_ADJUSTMENT = -78;
const CALORIES_PER_POUND_MILE = 0.63;

export const CALORIE_ESTIMATE_NOTE =
  "Educational estimate from age, height, weight, and weekly running goal. This is not medical advice.";

export function calorieEstimateMessage(profile = {}) {
  const { age, heightInches, height, weightLb, weight, weeklyMileageGoal } = profile ?? {};
  if (![age, heightInches ?? height, weightLb ?? weight].every(value =>
    (typeof value === "number" || typeof value === "string") && Number.isFinite(Number(value)) && Number(value) >= 1
  ) || !Number.isInteger(Number(age))) {
    return "Enter a valid age, height, and weight in Profile & goal to calculate an educational daily calorie estimate.";
  }
  if (!Number.isFinite(Number(weeklyMileageGoal)) || Number(weeklyMileageGoal) <= 0) {
    return "Set a positive weekly mileage goal in Profile & goal to calculate an educational daily calorie estimate.";
  }
  return "These inputs do not produce a supported calorie estimate. Review your profile and running goal.";
}

export function calorieInputs(profile = {}) {
  const { age, heightInches, height, weightLb, weight, weeklyMileageGoal } = profile ?? {};
  if (![age, heightInches ?? height, weightLb ?? weight, weeklyMileageGoal].every(value =>
    typeof value === "number" || typeof value === "string")) return null;
  const ageNum = Number(age);
  const heightNum = Number(heightInches ?? height);
  const weightNum = Number(weightLb ?? weight);
  const miles = Number(weeklyMileageGoal);
  const valid =
    Number.isInteger(ageNum) && ageNum >= CALORIE_INPUTS.minAge &&
    Number.isFinite(heightNum) && heightNum >= CALORIE_INPUTS.minHeightInches &&
    Number.isFinite(weightNum) && weightNum >= CALORIE_INPUTS.minWeightLb &&
    Number.isFinite(miles) && miles > CALORIE_INPUTS.minWeeklyMiles;
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
  const total = restingCalories + runningCalories;
  if (!Number.isSafeInteger(total) || total < 1 || restingCalories < 1) return null;
  return {
    calories: total,
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

// The goal in effect on a date is the latest entry dated on or before that day.
export function calorieGoalOn(goals, date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  let match = null;
  for (const goal of Array.isArray(goals) ? goals : []) {
    if (goal?.effectiveDate <= date && (!match || goal.effectiveDate > match.effectiveDate)) match = goal;
  }
  return match;
}
