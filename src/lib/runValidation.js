export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validateRunFields({ date, distanceMiles, durationMinutes }, today = localDate()) {
  const errors = {};
  const parsed = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00Z`) : null;
  if (!parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    errors.date = "Enter a valid run date.";
  } else if (date > today) {
    errors.date = "A completed run cannot be dated in the future.";
  }
  for (const [field, value, label] of [
    ["distanceMiles", distanceMiles, "Distance"],
    ["durationMinutes", durationMinutes, "Duration"],
  ]) {
    if ((typeof value !== "number" && typeof value !== "string") ||
        (typeof value === "string" && !value.trim()) || !Number.isFinite(Number(value)) || Number(value) <= 0) {
      errors[field] = `${label} must be a positive number.`;
    }
  }
  return errors;
}
