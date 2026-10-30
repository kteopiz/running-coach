// Profile and activity inputs for the educational daily calorie estimate.
// Age, height, and weight come from the runner profile. Weekly mileage is the running goal.
export const CALORIE_INPUTS = {
  minAge: 1,
  minHeightInches: 1,
  minWeightLb: 1,
  minWeeklyMiles: 0,
};

const POUNDS_PER_KILOGRAM = 2.2046226218;
const CENTIMETERS_PER_INCH = 2.54;
// Midpoint of the Mifflin-St Jeor constants for male (+5) and female (-161).
const RESTING_ADJUSTMENT = -78;
const CALORIES_PER_POUND_MILE = 0.63;

export const CALORIE_ESTIMATE_NOTE =
  "Educational estimate from age, height, weight, and weekly running goal. This is not medical advice.";

export function calorieInputs({ age, heightInches, height, weightLb, weight, weeklyMileageGoal } = {}) {
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
  return {
    calories: restingCalories + runningCalories,
    restingCalories,
    runningCalories,
    inputs,
    label: "Educational estimate",
  };
}
