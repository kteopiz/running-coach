import { localDate } from "./runValidation.js";

// Inputs are clamped to these bounds before a distance is chosen.
export const RECOMMENDATION_RULES = {
  minDaysLeft: 1,
  maxDaysLeft: 7,
  maxDailyMiles: 6,
  maxGoalShare: 0.25,
  restAfterRunDays: 3,
};

function roundTenth(value) {
  return Math.round(Number(value) * 10) / 10;
}

function asDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date();
}

export function daysLeftInWeek(today = new Date()) {
  const date = asDate(today);
  const mondayIndex = (date.getDay() + 6) % 7;
  return RECOMMENDATION_RULES.maxDaysLeft - mondayIndex;
}

export function clampDaysLeft(daysLeft, today = new Date()) {
  const parsed = Number(daysLeft);
  const days = Number.isFinite(parsed) ? Math.trunc(parsed) : daysLeftInWeek(today);
  return Math.min(RECOMMENDATION_RULES.maxDaysLeft, Math.max(RECOMMENDATION_RULES.minDaysLeft, days));
}

export function dailyCap(goalMiles) {
  const goal = Number(goalMiles);
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return roundTenth(Math.min(RECOMMENDATION_RULES.maxDailyMiles, goal * RECOMMENDATION_RULES.maxGoalShare));
}

// Remaining weekly miles. A missing goal has no remaining value.
// Completed distance below zero counts as zero, and the result never goes below zero.
export function remainingMiles(completedMiles, goalMiles) {
  const goal = Number(goalMiles);
  if (!Number.isFinite(goal) || goal <= 0) return null;
  const completed = Number.isFinite(Number(completedMiles)) ? Math.max(0, Number(completedMiles)) : 0;
  return roundTenth(Math.max(0, goal - completed));
}

function datesThisWeek(runDates, today) {
  const date = asDate(today);
  const todayString = localDate(date);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const mondayString = localDate(monday);
  return [...new Set((Array.isArray(runDates) ? runDates : []).filter(
    (runDate) => typeof runDate === "string" && runDate >= mondayString && runDate <= todayString,
  ))];
}

export function recommendToday({ completedMiles = 0, goalMiles, daysLeft, runDates = [], today = new Date() } = {}) {
  const todayString = localDate(asDate(today));
  const days = clampDaysLeft(daysLeft, today);
  const weekDates = datesThisWeek(runDates, today);
  const ranToday = weekDates.includes(todayString);
  const remaining = remainingMiles(completedMiles, goalMiles);
  const completed = Number.isFinite(Number(completedMiles)) ? Math.max(0, Number(completedMiles)) : 0;
  const base = { daysLeft: days, ranToday, remainingMiles: remaining };

  if (remaining == null) {
    return { ...base, todayMiles: null, status: "no-goal", message: "Set a weekly goal to get a distance for today." };
  }
  if (remaining === 0) {
    return { ...base, todayMiles: 0, status: "rest", message: "Your weekly goal is complete. Rest today." };
  }
  if (weekDates.length >= RECOMMENDATION_RULES.restAfterRunDays) {
    return { ...base, todayMiles: 0, status: "rest", message: "You have run enough days this week. Rest today." };
  }

  const cap = dailyCap(goalMiles);
  const evenShare = remaining / days;
  let todayMiles = roundTenth(Math.min(evenShare, cap, remaining));
  let status = todayMiles < roundTenth(evenShare) ? "reduced" : "suggested";

  if (ranToday) {
    todayMiles = roundTenth(Math.max(0, todayMiles / 2));
    status = todayMiles === 0 ? "rest" : "reduced";
  }

  if (status === "rest") {
    return { ...base, todayMiles: 0, status, message: "You already ran today. Rest instead of adding more miles." };
  }
  if (status === "reduced") {
    const reason = ranToday ? "You already ran today." : "That is less than an even split, so today stays manageable.";
    return { ...base, todayMiles, status, message: `${reason} Keep any further running to ${todayMiles} miles.` };
  }
  const start = completed <= 0 ? "No runs yet this week." : "You are partway to your goal.";
  return { ...base, todayMiles, status, message: `${start} Run ${todayMiles} miles today.` };
}
