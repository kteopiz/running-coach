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
