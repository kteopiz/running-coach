export const MEASUREMENT_MIN = 1;

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
  if (!Number.isFinite(ageNum) || ageNum < 1 || !Number.isInteger(ageNum)) {
    errors.age = "Age must be a whole number of at least 1.";
  }

  const heightNum = Number(height);
  if (!Number.isFinite(heightNum) || heightNum < MEASUREMENT_MIN) {
    errors.height = `Height must be at least ${MEASUREMENT_MIN} inch.`;
  }

  const weightNum = Number(weight);
  if (!Number.isFinite(weightNum) || weightNum < MEASUREMENT_MIN) {
    errors.weight = `Weight must be at least ${MEASUREMENT_MIN} lb.`;
  }

  return errors;
}

export function validateProfileFields({ age, height, weight, weeklyMileageGoal }) {
  const errors = validateMeasurements({ age, height, weight });

  if (weeklyMileageGoal === "" || weeklyMileageGoal === null || weeklyMileageGoal === undefined) {
    errors.weeklyMileageGoal = "Weekly mileage goal is required.";
  } else {
    const goalNum = Number(weeklyMileageGoal);
    if (!Number.isFinite(goalNum) || goalNum <= 0) {
      errors.weeklyMileageGoal = "Weekly mileage goal must be a positive number.";
    }
  }

  return errors;
}
