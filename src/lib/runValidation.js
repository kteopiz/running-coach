import { INPUT_LIMITS } from "./validation.js";

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function localTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function validateRunFields({ date, distanceMiles, durationMinutes, startTime, notes }, today = localDate()) {
  const errors = {};
  const parsed = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00Z`) : null;
  if (!parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    errors.date = "Enter a valid run date.";
  } else if (date > today) {
    errors.date = "A completed run cannot be dated in the future.";
  }
  if (typeof startTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    errors.startTime = "Enter the time the run started.";
  }
  if (notes != null && notes !== "" && (typeof notes !== "string" || notes.trim().length > INPUT_LIMITS.maxNotesLength)) {
    errors.notes = `Notes must be ${INPUT_LIMITS.maxNotesLength} characters or fewer.`;
  }
  const distance = Number(distanceMiles);
  if ((typeof distanceMiles !== "number" && typeof distanceMiles !== "string") ||
      (typeof distanceMiles === "string" && !distanceMiles.trim()) ||
      !Number.isFinite(distance) || distance < INPUT_LIMITS.minRunMiles || distance > INPUT_LIMITS.maxRunMiles) {
    errors.distanceMiles = `Distance must be from ${INPUT_LIMITS.minRunMiles} to ${INPUT_LIMITS.maxRunMiles} miles.`;
  }
  const duration = Number(durationMinutes);
  if ((typeof durationMinutes !== "number" && typeof durationMinutes !== "string") ||
      (typeof durationMinutes === "string" && !durationMinutes.trim()) ||
      !Number.isFinite(duration) || duration < INPUT_LIMITS.minDurationMinutes || duration > INPUT_LIMITS.maxDurationMinutes) {
    errors.durationMinutes = `Duration must be from ${INPUT_LIMITS.minDurationMinutes} to ${INPUT_LIMITS.maxDurationMinutes} minutes.`;
  }
  return errors;
}
