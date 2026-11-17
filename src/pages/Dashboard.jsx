import { useEffect, useRef, useState } from "react";
import { getActivity } from "../lib/userStore";
import { weeklyProgress } from "../lib/weeklyProgress";
import { CALORIE_ESTIMATE_NOTE, calorieEstimateMessage, estimateDailyCalories } from "../lib/calories";
import { recommendToday } from "../lib/recommendation";
import { localDate } from "../lib/runValidation";
import { formatCalories } from "../lib/format";
import { boundedProgress } from "../lib/progressDisplay";
import { distanceHeading, distanceUnitName, distanceUnitShort, formatDistanceAmount, formatHeight, recommendationText } from "../lib/units";

import AppShell from "../components/AppShell";
import CalorieChart from "../components/CalorieChart";
import MealLog from "../components/MealLog";
import WeekSummary from "../components/WeekSummary";
import RunHistory from "../components/RunHistory";

export default function Dashboard({ user, onNavigate }) {
  const hasGoal =
    user.weeklyMileageGoal !== null &&
    user.weeklyMileageGoal !== undefined &&
    Number(user.weeklyMileageGoal) > 0;
  const [revision, setRevision] = useState(0);
  const [nutritionRevision, setNutritionRevision] = useState(0);
  const [activity, setActivity] = useState(null);
  const [activityError, setActivityError] = useState("");
  const [loadingActivity, setLoadingActivity] = useState(true);
  const hasActivity = useRef(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const refresh = hasActivity.current;
      if (!refresh) setLoadingActivity(true);
      const result = await getActivity();
      if (!active) return;
      if (!result.ok) {
        if (!refresh) setActivity(null);
        setActivityError(result.error || "Could not load this week's mileage.");
      } else {
        setActivity(result);
        setActivityError("");
        hasActivity.current = true;
      }
      setLoadingActivity(false);
    }

    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [user.weeklyMileageGoal, revision]);

  const progress = activity ? weeklyProgress(activity.weeklyMiles, user.weeklyMileageGoal) : null;
  const recommendation = activity ? recommendToday({
    completedMiles: activity.weeklyMiles,
    goalMiles: user.weeklyMileageGoal,
    runDates: activity.runs.map((run) => run.date),
  }) : null;
  const progressPercent = boundedProgress(progress?.progress ?? 0, progress?.status);
  const calorieEstimate = estimateDailyCalories(user);
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <AppShell user={user} page="dashboard" onNavigate={onNavigate}>
      <div className="page-heading">
        <div><p className="eyebrow">YOUR TRAINING, AT A GLANCE</p><h1>Overview</h1><p className="muted">Welcome back, {user.name}.</p></div>
        <time className="date-label" dateTime={localDate()} aria-label={`Today, ${todayLabel}`}>{todayLabel}</time>
      </div>
      <section className="panel weekly-panel" aria-labelledby="progress-heading">
        <div className="section-heading"><div><h2 id="progress-heading">This week</h2><p className="muted">Sunday – Saturday · {distanceHeading(user.unitSystem)}</p></div>
          <button className="text-button" onClick={() => onNavigate("profile")}>{hasGoal ? "Edit goal" : "Set weekly goal"} <span aria-hidden="true">↗</span></button>
        </div>
        <div className="metrics">
          <div><p className="metric-label">Completed</p><p className="metric-value">{!loadingActivity && progress ? formatDistanceAmount(progress.completedMiles, user.unitSystem) : "—"}<span> {distanceUnitShort(user.unitSystem)}</span></p></div>
          <div><p className="metric-label">Weekly goal</p><p className="metric-value">{hasGoal ? formatDistanceAmount(user.weeklyMileageGoal, user.unitSystem) : "—"}<span> {distanceUnitShort(user.unitSystem)}</span></p></div>
          <div><p className="metric-label">Remaining</p><p className="metric-value">{!loadingActivity && progress?.remainingMiles != null ? formatDistanceAmount(progress.remainingMiles, user.unitSystem) : "—"}<span> {distanceUnitShort(user.unitSystem)}</span></p></div>
        </div>
        {loadingActivity ? <p className="muted" role="status">Loading this week’s progress…</p> : null}
        {activityError ? <p className="error" role="alert">{activityError}</p> : null}
        {progress && !loadingActivity ? <>
          {hasGoal ? <>
            <div className="progress-track" role="progressbar" aria-valuenow={progressPercent.value} aria-valuemin={0} aria-valuemax={100} aria-valuetext={progressPercent.label} aria-label="Weekly goal progress">
              <div className="progress-fill" style={{ width: progressPercent.width }} />
            </div>
            <div className="progress-caption"><span>{progress.status === "over-goal" ? `${formatDistanceAmount(progress.overMiles, user.unitSystem)} ${distanceUnitName(user.unitSystem)} beyond your goal. Nice work.` : progress.status === "complete" ? "Weekly goal reached. Nice work." : "Every run counts. Keep it going."}</span><strong>{progressPercent.label} complete</strong></div>
          </> : <p className="muted">Set a weekly goal to track your progress.</p>}
          {recommendation ? <div className="recommendation" aria-live="polite">
            <p className="metric-label" id="today-heading">Today</p>
            <p className="recommendation-miles">{recommendation.todayMiles == null ? "—" : formatDistanceAmount(recommendation.todayMiles, user.unitSystem)}<span> {distanceUnitShort(user.unitSystem)}</span></p>
            <p className="muted">{recommendationText(recommendation, user.unitSystem)}</p>
            <p className="panel-note">Educational running guidance only. This is not medical advice.</p>
          </div> : null}
        </> : null}
      </section>
      <WeekSummary user={user} runs={activity?.runs || []} refreshKey={nutritionRevision} />
      <section className="panel calorie-panel" aria-labelledby="calorie-heading">
        <h2 id="calorie-heading">Daily calorie estimate</h2>
        {calorieEstimate ? <>
          <p className="metric-label">{calorieEstimate.label}</p>
          <p className="metric-value">{formatCalories(calorieEstimate.calories)}<span> cal</span></p>
        </> : <p className="muted">{calorieEstimateMessage(user)} <button className="text-button" onClick={() => onNavigate("profile")}>Review profile & goal</button></p>}
        <p className="panel-note">{CALORIE_ESTIMATE_NOTE}</p>
      </section>
      <CalorieChart refreshKey={nutritionRevision} />
      <MealLog user={user} onNavigate={onNavigate} onChange={() => setNutritionRevision((value) => value + 1)} />
      <div className="dashboard-grid">
        <RunHistory unitSystem={user.unitSystem} runs={activity?.runs || []} loading={loadingActivity}
          error={activityError} onRefresh={() => setRevision(value => value + 1)} />
        <aside className="panel runner-panel" aria-labelledby="runner-heading">
          <div className="section-heading"><h2 id="runner-heading">Runner profile</h2><button className="text-button" onClick={() => onNavigate("profile")}>Edit <span aria-hidden="true">↗</span></button></div>
          <div className="runner-identity"><span className="avatar" aria-hidden="true">{user.name.trim().slice(0, 1).toUpperCase()}</span><div><h3>{user.name}</h3><p className="muted">{user.email}</p></div></div>
          <dl className="profile-facts"><div><dt>Age</dt><dd>{user.age}<span> years</span></dd></div><div><dt>Height</dt><dd>{formatHeight(user.height, user.unitSystem)}</dd></div><div><dt>Weight</dt><dd>{user.weight}<span> lb</span></dd></div></dl>
          <p className="panel-note">Your measurements and account details are separate from your weekly training goal.</p>
        </aside>
      </div>
    </AppShell>
  );
}
