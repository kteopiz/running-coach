import { useEffect, useState } from "react";
import { getCalorieGoals, getMeals } from "../lib/userStore";
import { runGoalDifference, weeklyCalorieDifference } from "../lib/summary";

function milesLine(result) {
  if (result.status === "missing") return "Set a weekly mileage goal to compare this week.";
  if (result.status === "met") return `On your ${result.goal} mi goal (${result.completed} mi completed).`;
  const sign = result.difference > 0 ? "+" : "−";
  const word = result.status === "above" ? "above" : "below";
  return `${sign}${Math.abs(result.difference)} mi ${word} your ${result.goal} mi goal (${result.completed} mi completed).`;
}

function calorieLine(result) {
  if (result.status === "missing") return "Set a calorie goal to compare this week.";
  if (result.status === "met") return `On the ${result.target.toLocaleString()} cal target for this week (${result.consumed.toLocaleString()} cal logged).`;
  const sign = result.difference > 0 ? "+" : "−";
  const word = result.status === "above" ? "above" : "below";
  return `${sign}${Math.abs(result.difference).toLocaleString()} cal ${word} the ${result.target.toLocaleString()} cal target (${result.consumed.toLocaleString()} cal logged).`;
}

export default function WeekSummary({ user, weeklyMiles }) {
  const [meals, setMeals] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getMeals(), getCalorieGoals()]).then(([mealResult, goalResult]) => {
      if (!active) return;
      if (!mealResult.ok || !goalResult.ok) setError(mealResult.error || goalResult.error || "Could not load this week's comparison.");
      else {
        setMeals(mealResult.meals || []);
        setGoals(goalResult.goals || []);
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const runs = runGoalDifference({ completedMiles: weeklyMiles ?? 0, weeklyGoal: user.weeklyMileageGoal });
  const calories = weeklyCalorieDifference({ meals, goals, dailyGoal: user.dailyCalorieGoal });

  return (
    <section className="panel week-summary" aria-labelledby="week-summary-heading">
      <h2 id="week-summary-heading">Against your goals</h2>
      <p className="muted section-description">Monday through today, in miles. Meal calories use the dated goal for each day, or your daily calorie goal when no dated goal applies yet.</p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <p><strong>Running. </strong>{weeklyMiles == null ? "Loading this week’s miles…" : milesLine(runs)}</p>
      <p><strong>Meals. </strong>{!loaded ? "Loading this week’s meals…" : calorieLine(calories)}</p>
    </section>
  );
}
