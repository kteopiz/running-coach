import { useEffect, useState } from "react";
import { getActivity } from "../lib/userStore";
import { weeklyProgress } from "../lib/weeklyProgress";

import AppShell from "../components/AppShell";
import MealLog from "../components/MealLog";
import RunHistory from "../components/RunHistory";

function formatMiles(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function Dashboard({ user, onNavigate }) {
  const hasGoal =
    user.weeklyMileageGoal !== null &&
    user.weeklyMileageGoal !== undefined &&
    Number(user.weeklyMileageGoal) > 0;
  const [revision, setRevision] = useState(0);
  const [activity, setActivity] = useState(null);
  const [activityError, setActivityError] = useState("");
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    let active = true;

    async function load(isRefresh) {
      if (!isRefresh) setLoadingActivity(true);
      const result = await getActivity();
      if (!active) return;
      if (!result.ok) {
        setActivity(null);
        setActivityError(result.error || "Could not load this week's mileage.");
      } else {
        setActivity(result);
        setActivityError("");
      }
      setLoadingActivity(false);
    }

    load(false);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [user.weeklyMileageGoal, revision]);

  const progress = activity ? weeklyProgress(activity.weeklyMiles, user.weeklyMileageGoal) : null;
  const progressPercent = progress?.progress == null ? 0 : Math.round(progress.progress * 100);

  return (
    <AppShell user={user} page="dashboard" onNavigate={onNavigate}>
      <div className="page-heading">
        <div><p className="eyebrow">YOUR TRAINING, AT A GLANCE</p><h1>Overview</h1><p className="muted">Welcome back, {user.name}.</p></div>
        <span className="date-label">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
      </div>
      <section className="panel weekly-panel" aria-labelledby="progress-heading">
        <div className="section-heading"><div><h2 id="progress-heading">This week</h2><p className="muted">Monday – Sunday · Miles</p></div>
          <button className="text-button" onClick={() => onNavigate("profile")}>{hasGoal ? "Edit goal" : "Set weekly goal"} <span aria-hidden="true">↗</span></button>
        </div>
        <div className="metrics">
          <div><p className="metric-label">Completed</p><p className="metric-value">{!loadingActivity && progress ? formatMiles(progress.completedMiles) : "—"}<span> mi</span></p></div>
          <div><p className="metric-label">Weekly goal</p><p className="metric-value">{hasGoal ? Number(user.weeklyMileageGoal) : "—"}<span> mi</span></p></div>
          <div><p className="metric-label">Remaining</p><p className="metric-value">{!loadingActivity && progress?.remainingMiles != null ? formatMiles(progress.remainingMiles) : "—"}<span> mi</span></p></div>
        </div>
        {loadingActivity ? <p className="muted" role="status">Loading this week’s progress…</p> : null}
        {activityError ? <p className="error" role="alert">{activityError}</p> : null}
        {progress && !loadingActivity ? <>
          {hasGoal ? <>
            <div className="progress-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly goal progress">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="progress-caption"><span>{progress.status === "over-goal" ? `${formatMiles(progress.overMiles)} miles beyond your goal. Nice work.` : progress.status === "complete" ? "Weekly goal reached. Nice work." : "Every run counts. Keep it going."}</span><strong>{progressPercent}% complete</strong></div>
          </> : <p className="muted">Set a weekly goal to track your progress.</p>}
        </> : null}
      </section>
      <MealLog user={user} onNavigate={onNavigate} />
      <div className="dashboard-grid">
        <RunHistory runs={activity?.runs || []} loading={loadingActivity}
          error={activityError} onRefresh={() => setRevision(value => value + 1)} />
        <aside className="panel runner-panel" aria-labelledby="runner-heading">
          <div className="section-heading"><h2 id="runner-heading">Runner profile</h2><button className="text-button" onClick={() => onNavigate("profile")}>Edit <span aria-hidden="true">↗</span></button></div>
          <div className="runner-identity"><span className="avatar" aria-hidden="true">{user.name.trim().slice(0, 1).toUpperCase()}</span><div><h3>{user.name}</h3><p className="muted">{user.email}</p></div></div>
          <dl className="profile-facts"><div><dt>Age</dt><dd>{user.age}<span> years</span></dd></div><div><dt>Height</dt><dd>{user.height}<span> in</span></dd></div><div><dt>Weight</dt><dd>{user.weight}<span> lb</span></dd></div></dl>
          <p className="panel-note">Your measurements and account details are separate from your weekly training goal.</p>
        </aside>
      </div>
    </AppShell>
  );
}
