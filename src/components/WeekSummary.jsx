import { useEffect, useState } from "react";
import { calorieGoalOn } from "../lib/calories";
import { formatCalories } from "../lib/format";
import { MEAL_KINDS } from "../lib/meals";
import { localDate } from "../lib/runValidation";
import { dailyTimeline, groupMealsByDay } from "../lib/summary";
import { distanceUnitShort, formatDistanceAmount } from "../lib/units";
import { getCalorieGoals, getMeals } from "../lib/userStore";
import { weekBounds } from "../lib/week";

function formatDay(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function clock(value) {
  if (!value) return "No time";
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function kindLabel(kind) {
  return MEAL_KINDS.find(([value]) => value === kind)?.[1] || kind;
}

function amount(miles, unitSystem) {
  return `${formatDistanceAmount(miles, unitSystem)} ${distanceUnitShort(unitSystem)}`;
}

function goalForDay(goals, dailyGoal, date) {
  const dated = calorieGoalOn(goals, date);
  if (dated && dated.calories != null) return { calories: dated.calories, savedOn: dated.effectiveDate };
  const fallback = Number(dailyGoal);
  if (Number.isInteger(fallback) && fallback > 0) return { calories: fallback, savedOn: null };
  return null;
}

function distanceReadout(miles, goalMiles, unitSystem) {
  const logged = amount(miles, unitSystem);
  const loggedClause = miles > 0 ? `You logged ${logged} from the runs above` : "You have not logged a run this week";
  const goal = Number(goalMiles);
  if (!Number.isFinite(goal) || goal <= 0) {
    return {
      figures: [
        ["Logged", logged],
        ["Weekly goal", "Not saved"],
        ["Still to log", "Set a goal"],
      ],
      sentence: `${loggedClause}. Save a weekly goal to compare that distance.`,
    };
  }
  const shownGoal = amount(goal, unitSystem);
  const difference = Math.round((goal - miles) * 1000) / 1000;
  if (difference === 0) {
    return {
      figures: [
        ["Logged", logged],
        ["Weekly goal", shownGoal],
        ["Still to log", "Goal met"],
      ],
      sentence: `${loggedClause}, which matches your weekly goal.`,
    };
  }
  if (difference > 0) {
    const left = amount(difference, unitSystem);
    return {
      figures: [
        ["Logged", logged],
        ["Weekly goal", shownGoal],
        ["Still to log", left],
      ],
      sentence: `${loggedClause}. Your weekly goal is ${shownGoal}, so you still have ${left} to log.`,
    };
  }
  const over = amount(Math.abs(difference), unitSystem);
  return {
    figures: [
      ["Logged", logged],
      ["Weekly goal", shownGoal],
      ["Over the goal", over],
    ],
      sentence: `${loggedClause}. Your weekly goal is ${shownGoal}, so you are ${over} over that goal.`,
  };
}

function mealReadout(calories, goal) {
  const logged = `${formatCalories(calories)} cal`;
  if (!goal) {
    return {
      figures: [
        ["Logged", logged],
        ["Calorie goal", "Not saved"],
      ],
      sentence: `You logged ${logged}. No calorie goal is saved for this day.`,
    };
  }
  const shownGoal = `${formatCalories(goal.calories)} cal`;
  const source = goal.savedOn ? `the goal saved on ${formatDay(goal.savedOn)}` : "your daily calorie goal";
  const difference = goal.calories - calories;
  if (difference === 0) {
    return {
      figures: [
        ["Logged", logged],
        ["Calorie goal", shownGoal],
        ["Compared with the goal", "Matches"],
      ],
      sentence: `You logged ${logged}, which matches ${source}.`,
    };
  }
  if (difference > 0) {
    const under = `${formatCalories(difference)} cal`;
    return {
      figures: [
        ["Logged", logged],
        ["Calorie goal", shownGoal],
        ["Under the goal", under],
      ],
      sentence: `You logged ${logged}. ${source[0].toUpperCase()}${source.slice(1)} is ${shownGoal}, so you are ${under} under that goal.`,
    };
  }
  const over = `${formatCalories(Math.abs(difference))} cal`;
  return {
    figures: [
      ["Logged", logged],
      ["Calorie goal", shownGoal],
      ["Over the goal", over],
    ],
    sentence: `You logged ${logged}. ${source[0].toUpperCase()}${source.slice(1)} is ${shownGoal}, so you are ${over} over that goal.`,
  };
}

function Figures({ rows }) {
  return (
    <div className="metrics week-figures">
      {rows.map(([label, value]) => (
        <div key={label}>
          <p className="metric-label">{label}</p>
          <p className="metric-value">{value}</p>
        </div>
      ))}
    </div>
  );
}

export default function WeekSummary({ user, runs = [], refreshKey = 0 }) {
  const [day, setDay] = useState(localDate);
  const [meals, setMeals] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const unitSystem = user.unitSystem;
  const bounds = weekBounds();
  const weekRuns = (Array.isArray(runs) ? runs : [])
    .filter((run) => run.date >= bounds.startDate && run.date <= bounds.todayDate)
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date) || String(left.startTime || "").localeCompare(String(right.startTime || "")));
  const miles = weekRuns.reduce((sum, run) => sum + Number(run.distanceMiles || 0), 0);
  const distance = distanceReadout(miles, user.weeklyMileageGoal, unitSystem);
  const grouped = groupMealsByDay({ meals });
  const timeline = dailyTimeline({ runs, meals, date: day });
  const range = `${formatDay(bounds.startDate)} through ${formatDay(bounds.todayDate)}`;

  useEffect(() => {
    let active = true;
    Promise.all([getMeals(), getCalorieGoals()]).then(([mealResult, goalResult]) => {
      if (!active) return;
      if (!mealResult.ok || !goalResult.ok) setError(mealResult.error || goalResult.error || "Could not load the saved meals.");
      else {
        setMeals(mealResult.meals || []);
        setGoals(goalResult.goals || []);
        setError("");
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <section className="panel week-summary" aria-labelledby="week-summary-heading">
      <div className="section-heading">
        <div>
          <h2 id="week-summary-heading">Logged this week</h2>
          <p className="muted">{range}. Each row is a run or meal you saved.</p>
        </div>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}

      <h3>Runs</h3>
      {weekRuns.length === 0 ? <p className="muted">No runs saved from {formatDay(bounds.startDate)} through today.</p> : (
        <table className="entry-table">
          <caption className="sr-only">Runs saved this week</caption>
          <thead><tr><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Distance</th></tr></thead>
          <tbody>
            {weekRuns.map((run) => (
              <tr key={run.id}>
                <td>{formatDay(run.date)}</td>
                <td>{clock(run.startTime)}</td>
                <td>{amount(run.distanceMiles, unitSystem)}{run.notes?.trim() ? `, ${run.notes.trim()}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Figures rows={distance.figures} />
      <p className="readout">{distance.sentence}</p>

      <h3>Meals</h3>
      {!loaded ? <p className="muted">Loading saved meals…</p> : grouped.empty ? <p className="muted">No meals saved from {formatDay(bounds.startDate)} through today.</p> : (
        grouped.days.map((entry) => {
          const readout = mealReadout(entry.calories, goalForDay(goals, user.dailyCalorieGoal, entry.date));
          return (
            <section key={entry.date} aria-label={formatDay(entry.date)}>
              <h4>{formatDay(entry.date)}</h4>
              {entry.periods.map((period) => (
                <div key={period.kind}>
                  <p className="metric-label">{kindLabel(period.kind)}</p>
                  <table className="entry-table">
                    <caption className="sr-only">{kindLabel(period.kind)} on {formatDay(entry.date)}</caption>
                    <thead><tr><th scope="col">Time</th><th scope="col">Meal</th><th scope="col">Calories</th></tr></thead>
                    <tbody>
                      {period.meals.map((meal) => (
                        <tr key={meal.id}>
                          <td>{clock(meal.time)}</td>
                          <td>{meal.description}</td>
                          <td>{formatCalories(meal.calories)} cal</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <Figures rows={readout.figures} />
              <p className="readout">{readout.sentence}</p>
            </section>
          );
        })
      )}
      {loaded && !grouped.empty ? <p className="readout">The meals above add up to {formatCalories(grouped.total)} cal.</p> : null}

      <h3>One day</h3>
      <label className="timeline-date">Day
        <input type="date" value={day} max={localDate()} onChange={(event) => setDay(event.target.value)} />
      </label>
      {!loaded ? <p className="muted">Loading saved meals…</p> : timeline.items.length === 0 ? <p className="muted">Nothing saved on {formatDay(day)}.</p> : (
        <>
          <table className="entry-table">
            <caption className="sr-only">Runs and meals saved on {formatDay(day)}</caption>
            <thead><tr><th scope="col">Time</th><th scope="col">Saved entry</th><th scope="col">Amount</th></tr></thead>
            <tbody>
              {timeline.items.map((item) => (
                <tr key={item.id}>
                  <td>{clock(item.time)}</td>
                  <td>{item.type === "run" ? (item.label || "Run") : `${kindLabel(item.kind)}, ${item.label}`}</td>
                  <td>{item.type === "run" ? amount(item.miles, unitSystem) : `${formatCalories(item.calories)} cal`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="readout">Those entries add up to {amount(timeline.miles, unitSystem)} and {formatCalories(timeline.calories)} cal.</p>
        </>
      )}
    </section>
  );
}
