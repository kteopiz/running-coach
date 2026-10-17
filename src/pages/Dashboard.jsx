import { useEffect, useState } from "react";
import { getActivity } from "../lib/userStore";
import { weeklyProgress } from "../lib/weeklyProgress";

function formatMiles(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function Dashboard({ user, onNavigate }) {
  const hasGoal =
    user.weeklyMileageGoal !== null &&
    user.weeklyMileageGoal !== undefined &&
    Number(user.weeklyMileageGoal) > 0;
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
  }, [user.weeklyMileageGoal]);

  const progress = activity ? weeklyProgress(activity.weeklyMiles, user.weeklyMileageGoal) : null;
  const progressPercent = progress?.progress == null ? 0 : Math.round(progress.progress * 100);

  return (
    <main className="page">
      <h1>running coach app</h1>
      <h2>Dashboard</h2>
      <p className="welcome">Welcome, {user.name}.</p>

      <nav className="nav">
        <button type="button" onClick={() => onNavigate("dashboard")}>
          Dashboard
        </button>
        <button type="button" onClick={() => onNavigate("profile")}>
          Profile
        </button>
        <button type="button" onClick={() => onNavigate("signout")}>
          Sign out
        </button>
      </nav>

      <section className="panel" aria-labelledby="goal-heading">
        <h3 id="goal-heading">Weekly mileage goal</h3>
        {hasGoal ? (
          <p className="goal-value">{Number(user.weeklyMileageGoal)} miles / week</p>
        ) : (
          <>
            <p>No weekly goal set yet.</p>
            <button type="button" onClick={() => onNavigate("profile")}>
              Set weekly goal
            </button>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="progress-heading">
        <h3 id="progress-heading">This week&apos;s progress</h3>
        {loadingActivity ? <p>Loading this week&apos;s mileage…</p> : null}
        {activityError ? <p className="error">{activityError}</p> : null}
        {progress ? (
          <>
            <p className="goal-value">{formatMiles(progress.completedMiles)} miles completed</p>
            {progress.status === "no-goal" ? (
              <p>Set a weekly goal to see the distance you have left.</p>
            ) : (
              <>
                <p>{formatMiles(progress.remainingMiles)} miles remaining</p>
                <p>{progressPercent}% of your weekly goal</p>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Weekly goal progress"
                >
                  <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                {progress.status === "complete" ? <p>You have reached your weekly goal.</p> : null}
                {progress.status === "over-goal" ? (
                  <p>You are {formatMiles(progress.overMiles)} miles past your weekly goal.</p>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="runs-heading">
        <h3 id="runs-heading">Recent runs</h3>
        <p className="placeholder">Coming soon — your logged runs will appear here.</p>
      </section>

      <section className="panel" aria-labelledby="coach-heading">
        <h3 id="coach-heading">Today&apos;s recommendation</h3>
        <p className="placeholder">Coming soon — personalized distance guidance will appear here.</p>
      </section>
    </main>
  );
}
