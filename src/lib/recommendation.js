import { localDate } from "./runValidation.js";

// A suggestion uses only the current week and stays inside these limits.
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

export function recommendToday({ completedMiles = 0, goalMiles, daysLeft, runDates = [], today = new Date() } = {}) {
  const todayDate = asDate(today);
  const todayString = localDate(todayDate);
  const days = clampDaysLeft(daysLeft, todayDate);
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7));
  const mondayString = localDate(monday);
  const weekDates = [...new Set((Array.isArray(runDates) ? runDates : []).filter(
    (runDate) => typeof runDate === "string" && runDate >= mondayString && runDate <= todayString,
  ))];
  const ranToday = weekDates.includes(todayString);
  const completed = Number.isFinite(Number(completedMiles)) ? Math.max(0, Number(completedMiles)) : 0;
  const goal = Number(goalMiles);
  const hasGoal = Number.isFinite(goal) && goal > 0;
  const remaining = hasGoal ? roundTenth(Math.max(0, goal - completed)) : null;
  const base = { daysLeft: days, ranToday, remainingMiles: remaining };

  if (!hasGoal) {
    return { ...base, todayMiles: null, status: "no-goal", message: "Set a weekly goal to get a distance for today." };
  }
  if (remaining === 0) {
    return { ...base, todayMiles: 0, status: "rest", message: "Your weekly goal is complete. Rest today." };
  }
  if (weekDates.length >= RECOMMENDATION_RULES.restAfterRunDays) {
    return { ...base, todayMiles: 0, status: "rest", message: "You have run enough days this week. Rest today." };
  }

  const cap = dailyCap(goal);
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
