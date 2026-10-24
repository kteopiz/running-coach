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

export function recommendToday({ completedMiles = 0, goalMiles, daysLeft, today = new Date() } = {}) {
  const days = clampDaysLeft(daysLeft, today);
  const goal = Number(goalMiles);
  const base = { daysLeft: days, ranToday: false };

  if (!Number.isFinite(goal) || goal <= 0) {
    return {
      ...base,
      todayMiles: null,
      remainingMiles: null,
      status: "no-goal",
      message: "Set a weekly goal to get a distance for today.",
    };
  }

  const completed = Number.isFinite(Number(completedMiles)) ? Number(completedMiles) : 0;
  const remaining = roundTenth(Math.max(0, goal - completed));
  if (remaining === 0) {
    return {
      ...base,
      todayMiles: 0,
      remainingMiles: 0,
      status: "rest",
      message: "Your weekly goal is complete. Rest today.",
    };
  }

  const todayMiles = roundTenth(Math.min(remaining / days, dailyCap(goal), remaining));
  const start = completed <= 0 ? "No runs yet this week." : "You are partway to your goal.";
  return {
    ...base,
    todayMiles,
    remainingMiles: remaining,
    status: "suggested",
    message: `${start} Run ${todayMiles} miles today.`,
  };
}
