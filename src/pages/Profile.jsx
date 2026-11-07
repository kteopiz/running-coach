import AppShell from "../components/AppShell";
import { useState } from "react";
import { MEASUREMENT_MIN, updateCurrentAccount, updateCurrentUser, validateProfileFields } from "../lib/userStore";

export default function Profile({ user, onUserChange, onNavigate }) {
  const [age, setAge] = useState(String(user.age ?? ""));
  const [height, setHeight] = useState(String(user.height ?? ""));
  const [weight, setWeight] = useState(String(user.weight ?? ""));
  const [weeklyMileageGoal, setWeeklyMileageGoal] = useState(
    user.weeklyMileageGoal !== null && user.weeklyMileageGoal !== undefined
      ? String(user.weeklyMileageGoal)
      : ""
  );
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(
    user.dailyCalorieGoal != null ? String(user.dailyCalorieGoal) : ""
  );
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setSuccess("");

    const nextErrors = validateProfileFields({
      age,
      height,
      weight,
      weeklyMileageGoal,
      dailyCalorieGoal,
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
      dailyCalorieGoal: dailyCalorieGoal === "" ? null : Number(dailyCalorieGoal),
    });
    setPending(false);

    if (!result.ok) {
      setErrors({ form: result.error });
      return;
    }

    onUserChange(result.user);
    setSuccess("Profile and goals saved.");
  }

  return (
    <AppShell user={user} page="profile" onNavigate={onNavigate}>
      <div className="page-heading"><div><p className="eyebrow">MAKE IT YOURS</p><h1>Profile & goal</h1><p className="muted">Your details. Your next milestone.</p></div></div>
      <div className="profile-grid">
      <section className="panel"><AccountSettings user={user} onUserChange={onUserChange} /></section>
      <section className="panel">
      <h2>Measurements & goals</h2><p className="muted section-description">Keep your profile current, set a distance to work toward, and set a daily calorie goal.</p>
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

        <label className="weekly-goal-field">
          Daily calorie goal (calories)
          <input
            name="dailyCalorieGoal"
            type="number"
            min="1"
            max="10000"
            step="1"
            value={dailyCalorieGoal}
            onChange={(event) => setDailyCalorieGoal(event.target.value)}
            aria-invalid={Boolean(errors.dailyCalorieGoal)}
          />
          {errors.dailyCalorieGoal ? <span className="error">{errors.dailyCalorieGoal}</span> : null}
          <span className="account-help">Optional. Meal logging uses this to calculate remaining calories. Leave it blank to clear it.</span>
        </label>

        {errors.form ? <p className="error">{errors.form}</p> : null}
        {success ? <p className="success">{success}</p> : null}

        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </form>
      </section>
      </div>
    </AppShell>
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
