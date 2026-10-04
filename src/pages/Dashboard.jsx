export default function Dashboard({ user, onNavigate }) {
  const hasGoal =
    user.weeklyMileageGoal !== null &&
    user.weeklyMileageGoal !== undefined &&
    Number(user.weeklyMileageGoal) > 0;

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
        <p className="placeholder">Coming soon — weekly completed mileage will appear here.</p>
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
