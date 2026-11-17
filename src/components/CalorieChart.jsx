import { useEffect, useState } from "react";
import { getCalorieGoals, getMeals } from "../lib/userStore";
import { calorieChartDays, chartScale } from "../lib/summary";

function weekday(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

export default function CalorieChart({ refreshKey = 0 }) {
  const [meals, setMeals] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getMeals(), getCalorieGoals()]).then(([mealResult, goalResult]) => {
      if (!active) return;
      if (!mealResult.ok || !goalResult.ok) setError(mealResult.error || goalResult.error || "Could not load the calorie chart.");
      else {
        setMeals(mealResult.meals || []);
        setGoals(goalResult.goals || []);
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [refreshKey]);

  const chart = calorieChartDays({ meals, goals });
  const scale = chartScale(chart.rows);

  return (
    <section className="panel calorie-chart-panel" aria-labelledby="calorie-chart-heading">
      <h2 id="calorie-chart-heading">Calories this week</h2>
      <p className="muted section-description">Each bar is a day with at least one saved meal. A day with no meal is left out. The line is the dated goal active that day. A goal dated in the future is not active yet.</p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {!loaded ? <p className="muted">Loading the calorie chart…</p> : null}
      {loaded && !error && chart.rows.length === 0 ? <p className="muted">No meals are logged from Sunday through today.</p> : null}
      {loaded && !error && chart.rows.length > 0 && chart.empty ? <p className="muted">No calorie goal applies to this week yet. Save a goal dated today or earlier to compare what you eat.</p> : null}
      {loaded && !error && chart.rows.length > 0 && !chart.empty ? (
        <div className="calorie-chart" role="list" aria-label="Daily calories compared with the active goal">
          {chart.rows.map((row) => {
            const bar = Math.round((row.consumed / scale) * 100);
            const line = row.goal == null ? null : Math.min(100, (row.goal / scale) * 100);
            const caption = row.goal == null ? `${row.consumed.toLocaleString()} cal, no goal yet` : `${row.consumed.toLocaleString()} of ${row.goal.toLocaleString()} cal`;
            return (
              <div className="calorie-chart-day" role="listitem" key={row.date} aria-label={`${weekday(row.date)}, ${caption}`}>
                <div className="calorie-chart-plot" aria-hidden="true">
                  {line != null ? <span className="calorie-chart-goal" style={{ bottom: line >= 100 ? "calc(100% - 2px)" : `${line}%` }} /> : null}
                  <span className="calorie-chart-bar" style={{ height: `${Math.max(bar, row.consumed > 0 ? 4 : 0)}%` }} />
                </div>
                <span className="calorie-chart-label">{weekday(row.date)}</span>
                <span className="calorie-chart-caption">{caption}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
