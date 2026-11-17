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

function amount(value) {
  const rounded = roundTenth(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function miles(value) {
  const text = amount(value);
  return `${text} ${text === "1" ? "mile" : "miles"}`;
}

// The even split is unconstrained when it already fits under both caps.
// Otherwise the smaller cap is the rule that set the distance.
function limitingRule(evenShare, goalMiles) {
  const share = goalMiles * RECOMMENDATION_RULES.maxGoalShare;
  const safety = RECOMMENDATION_RULES.maxDailyMiles;
  const bound = Math.min(share, safety);
  if (evenShare <= bound + 1e-9 && roundTenth(evenShare) <= Math.floor(bound * 10) / 10 + 1e-9) return "even";
  return share <= safety + 1e-9 ? "weekly-allocation" : "daily-cap";
}

function guidanceMessage({ rule, ranToday, todayMiles, cappedMiles, goalMiles, remaining, evenShare, completed }) {
  if (ranToday && rule === "weekly-allocation") {
    return `You already ran today, so this is half of the ${amount(cappedMiles)}-mile cap. The cap is 25% of your ${amount(goalMiles)}-mile week, and a day never goes above 6 miles.`;
  }
  if (ranToday && rule === "daily-cap") {
    return `You already ran today, so this is half of the ${amount(cappedMiles)}-mile daily safety cap. A day never goes above 6 miles.`;
  }
  if (ranToday) {
    return `You already ran today, so this is half of the ${amount(cappedMiles)}-mile weekly allocation.`;
  }
  if (rule === "weekly-allocation") {
    return `Today is capped at ${miles(todayMiles)}. That is 25% of your ${amount(goalMiles)}-mile week, and a day never goes above 6 miles. Splitting the ${miles(remaining)} still left across the days left would be ${miles(evenShare)} today.`;
  }
  if (rule === "daily-cap") {
    return `Today is capped at ${miles(todayMiles)} by the daily safety cap. A day never goes above 6 miles, which is less than 25% of your ${amount(goalMiles)}-mile week. Splitting the ${miles(remaining)} still left across the days left would be ${miles(evenShare)} today.`;
  }
  const start = completed <= 0 ? "No runs yet this week." : "You are partway to your goal.";
  return `${start} Today follows an even weekly allocation of ${miles(todayMiles)}.`;
}

function asDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date();
}

// Sunday is the first day (7 left) and Saturday is the last (1 left).
export function weekBounds(today = new Date()) {
  const date = asDate(today);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start, end, startDate: localDate(start), endDate: localDate(end) };
}

export function daysLeftInWeek(today = new Date()) {
  return RECOMMENDATION_RULES.maxDaysLeft - asDate(today).getDay();
}

export function clampDaysLeft(daysLeft, today = new Date()) {
  const parsed = Number(daysLeft);
  const days = Number.isFinite(parsed) ? Math.trunc(parsed) : daysLeftInWeek(today);
  return Math.min(RECOMMENDATION_RULES.maxDaysLeft, Math.max(RECOMMENDATION_RULES.minDaysLeft, days));
}

export function dailyCap(goalMiles) {
  const goal = Number(goalMiles);
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(RECOMMENDATION_RULES.maxDailyMiles, goal * RECOMMENDATION_RULES.maxGoalShare);
}

// Remaining weekly miles. A missing goal has no remaining value.
// Completed distance below zero counts as zero, and the result never goes below zero.
export function remainingMiles(completedMiles, goalMiles) {
  const goal = Number(goalMiles);
  if (!Number.isFinite(goal) || goal <= 0) return null;
  const completed = Number.isFinite(Number(completedMiles)) ? Math.max(0, Number(completedMiles)) : 0;
  return Math.max(0, goal - completed);
}

function datesThisWeek(runDates, today) {
  const date = asDate(today);
  const todayString = localDate(date);
  const { startDate } = weekBounds(date);
  return [...new Set((Array.isArray(runDates) ? runDates : []).filter(
    (runDate) => typeof runDate === "string" && runDate >= startDate && runDate <= todayString,
  ))];
}

export function recommendToday({ completedMiles = 0, goalMiles, daysLeft, runDates = [], today = new Date() } = {}) {
  const todayString = localDate(asDate(today));
  const days = clampDaysLeft(daysLeft, today);
  const weekDates = datesThisWeek(runDates, today);
  const ranToday = weekDates.includes(todayString);
  const remaining = remainingMiles(completedMiles, goalMiles);
  const completed = Number.isFinite(Number(completedMiles)) ? Math.max(0, Number(completedMiles)) : 0;
  const base = { daysLeft: days, ranToday, remainingMiles: remaining, rule: null };

  if (remaining == null) {
    return { ...base, todayMiles: null, status: "no-goal", message: "Set a weekly goal to get a distance for today." };
  }
  if (remaining === 0) {
    return { ...base, todayMiles: 0, status: "rest", message: "Your weekly goal is complete. Rest today." };
  }
  // Three run days suggest rest only once half of the weekly goal is already logged.
  if (weekDates.length >= RECOMMENDATION_RULES.restAfterRunDays && !(remaining > Number(goalMiles) / 2)) {
    return { ...base, todayMiles: 0, status: "rest", message: "You have run enough days this week. Rest today." };
  }

  const cap = dailyCap(goalMiles);
  const evenShare = remaining / days;
  const rule = limitingRule(evenShare, Number(goalMiles));
  // Round normally for readability, but round down if rounding would cross a bound.
  const bound = Math.min(cap, remaining);
  let todayMiles = Math.min(roundTenth(Math.min(evenShare, bound)), Math.floor(bound * 10) / 10);
  const cappedMiles = todayMiles;
  let status = todayMiles < roundTenth(evenShare) ? "reduced" : "suggested";

  if (ranToday) {
    todayMiles = roundTenth(Math.max(0, todayMiles / 2));
    status = todayMiles === 0 ? "rest" : "reduced";
  }

  if (todayMiles === 0) {
    status = "rest";
    return { ...base, todayMiles: 0, status, message: ranToday
      ? "You already ran today. Rest instead of adding more miles."
      : "Today’s bounded distance is less than 0.1 miles. Rest today; your weekly goal is not yet complete." };
  }
  const message = guidanceMessage({
    rule, ranToday, todayMiles, cappedMiles, goalMiles: Number(goalMiles), remaining, evenShare, completed,
  });
  return { ...base, todayMiles, status, rule, message };
}
