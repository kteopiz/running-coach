// Profile and activity inputs for the educational daily calorie estimate.
// Age, height, and weight come from the runner profile. Weekly mileage is the running goal.
export const CALORIE_INPUTS = {
  minAge: 1,
  minHeightInches: 1,
  minWeightLb: 1,
  minWeeklyMiles: 0,
};

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
