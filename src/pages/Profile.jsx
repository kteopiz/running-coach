import AppShell from "../components/AppShell";
import { useEffect, useState } from "react";
import { CALORIE_ESTIMATE_NOTE, calorieGoalOn, estimateDailyCalories, validateCalorieGoal } from "../lib/calories";
import { localDate } from "../lib/runValidation";
import { MEASUREMENT_MIN, getCalorieGoals, saveCalorieGoal, updateCurrentAccount, updateCurrentUser, validateProfileFields } from "../lib/userStore";

export default function Profile({ user, onUserChange, onNavigate }) {
  const [age, setAge] = useState(String(user.age ?? ""));
  const [height, setHeight] = useState(String(user.height ?? ""));
  const [weight, setWeight] = useState(String(user.weight ?? ""));
  const [weeklyMileageGoal, setWeeklyMileageGoal] = useState(
    user.weeklyMileageGoal !== null && user.weeklyMileageGoal !== undefined
      ? String(user.weeklyMileageGoal)
      : ""
  );
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const calorieEstimate = estimateDailyCalories({ age, height, weight, weeklyMileageGoal });

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setSuccess("");

    const nextErrors = validateProfileFields({
      age,
      height,
      weight,
      weeklyMileageGoal,
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setPending(true);
    const result = await updateCurrentUser({
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      weeklyMileageGoal: Number(weeklyMileageGoal),
    });
    setPending(false);

    if (!result.ok) {
      setErrors({ form: result.error });
      return;
    }

    onUserChange(result.user);
    setSuccess("Profile and weekly goal saved.");
  }

  return (
    <AppShell user={user} page="profile" onNavigate={onNavigate}>
      <div className="page-heading"><div><p className="eyebrow">MAKE IT YOURS</p><h1>Profile & goal</h1><p className="muted">Your details. Your next milestone.</p></div></div>
      <div className="profile-grid">
      <section className="panel"><AccountSettings user={user} onUserChange={onUserChange} /></section>
      <section className="panel">
      <h2>Measurements & weekly goal</h2><p className="muted section-description">Keep your profile current and set a distance to work toward.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Age
          <input
            name="age"
            type="number"
            min="1"
            step="1"
            value={age}
            onChange={(event) => setAge(event.target.value)}
            aria-invalid={Boolean(errors.age)}
          />
          {errors.age ? <span className="error">{errors.age}</span> : null}
        </label>

        <label>
          Height (inches)
          <input
            name="height"
            type="number"
            min={MEASUREMENT_MIN}
            step="0.1"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            aria-invalid={Boolean(errors.height)}
          />
          {errors.height ? <span className="error">{errors.height}</span> : null}
        </label>

        <label>
          Weight (lb)
          <input
            name="weight"
            type="number"
            min={MEASUREMENT_MIN}
            step="0.1"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            aria-invalid={Boolean(errors.weight)}
          />
          {errors.weight ? <span className="error">{errors.weight}</span> : null}
        </label>

        <label className="weekly-goal-field">
          Weekly mileage goal (miles)
          <input
            name="weeklyMileageGoal"
            type="number"
            min="0.1"
            step="0.1"
            value={weeklyMileageGoal}
            onChange={(event) => setWeeklyMileageGoal(event.target.value)}
            aria-invalid={Boolean(errors.weeklyMileageGoal)}
          />
          {errors.weeklyMileageGoal ? (
            <span className="error">{errors.weeklyMileageGoal}</span>
          ) : null}
        </label>
        {calorieEstimate ? <p className="muted">{calorieEstimate.label}: {calorieEstimate.calories.toLocaleString()} cal a day. {CALORIE_ESTIMATE_NOTE}</p> : <p className="muted">Enter a weekly mileage goal to see the educational calorie estimate.</p>}

        {errors.form ? <p className="error">{errors.form}</p> : null}
        {success ? <p className="success">{success}</p> : null}

        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </form>
      </section>
      </div>
      <CalorieGoals />
    </AppShell>
  );
}

function formatDay(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function CalorieGoals() {
  const [goals, setGoals] = useState([]);
  const [effectiveDate, setEffectiveDate] = useState(localDate());
  const [calories, setCalories] = useState("");
  const [lookupDate, setLookupDate] = useState(localDate());
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    getCalorieGoals().then((result) => {
      if (!active) return;
      if (!result.ok) setLoadError(result.error || "Could not load calorie goals.");
      else setGoals(result.goals || []);
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setMessage("");
    const nextErrors = validateCalorieGoal({ effectiveDate, calories });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    const result = await saveCalorieGoal({ effectiveDate, calories: Number(calories) });
    setPending(false);
    if (!result.ok) return setErrors({ form: result.error });
    setGoals(result.goals || []);
    setCalories("");
    setMessage("Calorie goal saved.");
  }

  const onDate = calorieGoalOn(goals, lookupDate);

  return (
    <section className="panel calorie-goals" aria-labelledby="calorie-goal-heading">
      <h2 id="calorie-goal-heading">Calorie goals</h2>
      <p className="muted section-description">Save the calorie goal for a date. Earlier goals stay on record, including the age on your profile when you saved them.</p>
      <form onSubmit={handleSubmit} noValidate>
        <label>
          Date this goal applies
          <input name="effectiveDate" type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} aria-invalid={Boolean(errors.effectiveDate)} required />
          {errors.effectiveDate ? <span className="error">{errors.effectiveDate}</span> : null}
        </label>
        <label>
          Calorie goal
          <input name="calories" type="number" min="1" max="10000" step="1" value={calories} onChange={(event) => setCalories(event.target.value)} aria-invalid={Boolean(errors.calories)} required />
          {errors.calories ? <span className="error">{errors.calories}</span> : null}
        </label>
        {errors.form ? <p className="error" role="alert">{errors.form}</p> : null}
        {message ? <p className="success" role="status">{message}</p> : null}
        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save calorie goal"}</button>
      </form>
      <label>
        Goal on this date
        <input type="date" value={lookupDate} onChange={(event) => setLookupDate(event.target.value)} />
      </label>
      <p className="muted">{onDate ? `${onDate.calories.toLocaleString()} cal, from the goal saved on ${formatDay(onDate.effectiveDate)} at age ${onDate.age}.` : "No calorie goal was set on or before this date."}</p>
      {loadError ? <p className="error" role="alert">{loadError}</p> : null}
      {goals.length === 0 ? <p className="muted">No calorie goals yet.</p> : (
        <ul className="goal-history">
          {goals.map((goal) => (
            <li key={goal.id}>
              <time dateTime={goal.effectiveDate}>{formatDay(goal.effectiveDate)}</time>
              <span>Age {goal.age}</span>
              <strong>{goal.calories.toLocaleString()} cal</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AccountSettings({ user, onUserChange }) {
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setSuccess("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    const result = await updateCurrentAccount({
      email,
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    formElement.reset();
    setEmail(result.user.email);
    onUserChange(result.user);
    setSuccess("Account details saved.");
  }

  return (
    <>
      <h2>Account details</h2><p className="muted section-description">Manage your email and password.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          New password (optional)
          <input name="password" type="password" autoComplete="new-password" />
        </label>
        <label>
          Confirm new password
          <input name="confirmPassword" type="password" autoComplete="new-password" />
        </label>
        <p className="account-help">Leave password fields blank to keep your current password.</p>
        {error ? <p className="error" role="alert">{error}</p> : null}
        {success ? <p className="success" role="status">{success}</p> : null}
        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save account"}</button>
      </form>
    </>
  );
}
