export const INPUT_LIMITS = {
  minAge: 10,
  maxAge: 100,
  minHeightInches: 36,
  maxHeightInches: 96,
  minWeightLb: 50,
  maxWeightLb: 400,
  minWeeklyMiles: 0.1,
  maxWeeklyMiles: 100,
  minRunMiles: 0.1,
  maxRunMiles: 100,
  minDurationMinutes: 1,
  maxDurationMinutes: 1440,
  maxNameLength: 80,
  maxNotesLength: 500,
  minGoalCalories: 1,
  maxGoalCalories: 10000,
};

export const MEASUREMENT_MIN = INPUT_LIMITS.minHeightInches;

function finiteNumber(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function validateName(name) {
  if (typeof name !== "string" || !name.trim()) return "Name is required.";
  if (name.trim().length > INPUT_LIMITS.maxNameLength) return `Name must be ${INPUT_LIMITS.maxNameLength} characters or fewer.`;
  return null;
}

export function validateAccountFields({ email, password, confirmPassword }, passwordRequired) {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }
  if (passwordRequired || password !== "") {
    if (typeof password !== "string" || !password.trim()) {
      return "Enter a new password.";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
  } else if (confirmPassword !== "") {
    return "Enter a new password.";
  }
  return null;
}

export function validateMeasurements({ age, height, weight }) {
  const errors = {};

  const ageNum = Number(age);
  if (!Number.isInteger(ageNum) || ageNum < INPUT_LIMITS.minAge || ageNum > INPUT_LIMITS.maxAge) {
    errors.age = `Age must be a whole number from ${INPUT_LIMITS.minAge} to ${INPUT_LIMITS.maxAge}.`;
  }

  const heightNum = finiteNumber(height);
  if (heightNum == null || heightNum < INPUT_LIMITS.minHeightInches || heightNum > INPUT_LIMITS.maxHeightInches) {
    errors.height = `Height must be from ${INPUT_LIMITS.minHeightInches} to ${INPUT_LIMITS.maxHeightInches} inches.`;
  }

  const weightNum = finiteNumber(weight);
  if (weightNum == null || weightNum < INPUT_LIMITS.minWeightLb || weightNum > INPUT_LIMITS.maxWeightLb) {
    errors.weight = `Weight must be from ${INPUT_LIMITS.minWeightLb} to ${INPUT_LIMITS.maxWeightLb} lb.`;
  }

  return errors;
}

export function validateProfileFields({ age, height, weight, weeklyMileageGoal, dailyCalorieGoal }) {
  const errors = validateMeasurements({ age, height, weight });

  if (weeklyMileageGoal === "" || weeklyMileageGoal === null || weeklyMileageGoal === undefined) {
    errors.weeklyMileageGoal = "Weekly mileage goal is required.";
  } else {
    const goalNum = finiteNumber(weeklyMileageGoal);
    if (goalNum == null || goalNum < INPUT_LIMITS.minWeeklyMiles || goalNum > INPUT_LIMITS.maxWeeklyMiles) {
      errors.weeklyMileageGoal = `Weekly mileage goal must be from ${INPUT_LIMITS.minWeeklyMiles} to ${INPUT_LIMITS.maxWeeklyMiles} miles.`;
    }
  }

  if (!(dailyCalorieGoal === "" || dailyCalorieGoal === null || dailyCalorieGoal === undefined)) {
    const calorieGoal = Number(dailyCalorieGoal);
    if (!Number.isInteger(calorieGoal) || calorieGoal < INPUT_LIMITS.minGoalCalories || calorieGoal > INPUT_LIMITS.maxGoalCalories) {
      errors.dailyCalorieGoal = `Daily calorie goal must be a whole number from ${INPUT_LIMITS.minGoalCalories} to ${INPUT_LIMITS.maxGoalCalories}.`;
    }
  }

  return errors;
}
