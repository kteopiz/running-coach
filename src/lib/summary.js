import { activeCalorieTarget, calorieGoalOn } from "./calories.js";
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

export function weeklyCalorieDifference({ meals = [], goals = [], dailyGoal = null, today = new Date() } = {}) {
  const grouped = groupMealsByDay({ meals, today });
  const { startDate, todayDate, total } = grouped;
  if (grouped.empty) return { status: "missing", consumed: 0, target: null, difference: null, startDate, todayDate };
  const comparable = grouped.days.flatMap((day) => {
    const target = activeCalorieTarget(goals, dailyGoal, day.date);
    return target ? [{ consumed: day.calories, target: target.calories }] : [];
  });
  if (comparable.length === 0) return { status: "missing", consumed: total, target: null, difference: null, startDate, todayDate };
  const consumed = comparable.reduce((sum, day) => sum + day.consumed, 0);
  const target = comparable.reduce((sum, day) => sum + day.target, 0);
  const difference = consumed - target;
  const status = difference > 0 ? "above" : difference < 0 ? "below" : "met";
  return { status, consumed, target, difference, startDate, todayDate };
}

const MEAL_PERIODS = ["breakfast", "lunch", "dinner", "snack"];

export function groupMealsByDay({ meals = [], today = new Date() } = {}) {
  const { startDate, todayDate } = weekBounds(today);
  const inWeek = (Array.isArray(meals) ? meals : []).filter((meal) => meal.date >= startDate && meal.date <= todayDate);
  const days = eachDate(startDate, todayDate).map((date) => {
    const dayMeals = inWeek.filter((meal) => meal.date === date);
    const periods = MEAL_PERIODS.map((kind) => {
      const items = dayMeals.filter((meal) => meal.kind === kind);
      return {
        kind,
        meals: items,
        calories: items.reduce((sum, meal) => sum + Number(meal.calories || 0), 0),
      };
    }).filter((period) => period.meals.length > 0);
    return {
      date,
      periods,
      calories: dayMeals.reduce((sum, meal) => sum + Number(meal.calories || 0), 0),
    };
  }).filter((day) => day.periods.length > 0);
  const total = days.reduce((sum, day) => sum + day.calories, 0);
  return { startDate, todayDate, days, total, empty: days.length === 0 };
}

export function dailyTimeline({ runs = [], meals = [], date } = {}) {
  const items = [
    ...(Array.isArray(runs) ? runs : []).filter((run) => run.date === date).map((run) => ({
      type: "run",
      time: run.startTime || "",
      id: `run-${run.id}`,
      miles: Number(run.distanceMiles || 0),
      label: run.notes?.trim() || "Run",
    })),
    ...(Array.isArray(meals) ? meals : []).filter((meal) => meal.date === date).map((meal) => ({
      type: "meal",
      time: meal.time || "",
      id: `meal-${meal.id}`,
      calories: Number(meal.calories || 0),
      label: meal.description || meal.kind,
      kind: meal.kind,
    })),
  ].sort((left, right) => {
    if (!left.time && !right.time) return 0;
    if (!left.time) return 1;
    if (!right.time) return -1;
    return left.time.localeCompare(right.time);
  });
  return {
    date,
    items,
    miles: roundTenth(items.filter((item) => item.type === "run").reduce((sum, item) => sum + item.miles, 0)),
    calories: items.filter((item) => item.type === "meal").reduce((sum, item) => sum + item.calories, 0),
  };
}
