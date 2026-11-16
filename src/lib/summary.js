import { calorieGoalOn } from "./calories.js";
import { eachDate, weekBounds } from "./week.js";

export function calorieChartDays({ meals = [], goals = [], today = new Date() } = {}) {
  const { startDate, todayDate } = weekBounds(today);
  const rows = eachDate(startDate, todayDate).map((date) => {
    const goal = calorieGoalOn(goals, date);
    const consumed = (Array.isArray(meals) ? meals : [])
      .filter((meal) => meal.date === date)
      .reduce((sum, meal) => sum + Number(meal.calories || 0), 0);
    return { date, consumed, goal: goal ? goal.calories : null };
  });
  return { startDate, todayDate, rows, empty: rows.length === 0 || rows.every((row) => row.goal == null) };
}

export function chartScale(rows) {
  const values = rows.flatMap((row) => [row.consumed, row.goal || 0]);
  return Math.max(1, ...values);
}

function roundTenth(value) {
  return Math.round(Number(value) * 10) / 10;
}

export function runGoalDifference({ completedMiles = 0, weeklyGoal = null } = {}) {
  const completed = Number.isFinite(Number(completedMiles)) ? roundTenth(Math.max(0, Number(completedMiles))) : 0;
  const goal = Number(weeklyGoal);
  if (!Number.isFinite(goal) || goal <= 0) return { status: "missing", completed, goal: null, difference: null };
  const difference = roundTenth(completed - goal);
  const status = difference > 0 ? "above" : difference < 0 ? "below" : "met";
  return { status, completed, goal, difference };
}

function targetForDate(goals, dailyGoal, date) {
  const dated = calorieGoalOn(goals, date);
  if (dated) return dated.calories;
  const fallback = Number(dailyGoal);
  return Number.isInteger(fallback) && fallback > 0 ? fallback : null;
}

export function weeklyCalorieDifference({ meals = [], goals = [], dailyGoal = null, today = new Date() } = {}) {
  const { startDate, todayDate } = weekBounds(today);
  const days = eachDate(startDate, todayDate);
  const targets = days.map((date) => targetForDate(goals, dailyGoal, date));
  if (targets.every((value) => value == null)) return { status: "missing", consumed: 0, target: null, difference: null, startDate, todayDate };
  const target = targets.reduce((sum, value) => sum + (value || 0), 0);
  const consumed = (Array.isArray(meals) ? meals : [])
    .filter((meal) => meal.date >= startDate && meal.date <= todayDate)
    .reduce((sum, meal) => sum + Number(meal.calories || 0), 0);
  const difference = consumed - target;
  const status = difference > 0 ? "above" : difference < 0 ? "below" : "met";
  return { status, consumed, target, difference, startDate, todayDate };
}
