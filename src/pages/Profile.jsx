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
    <main className="page">
      <h1>running coach app</h1>
      <h2>Profile</h2>
      <p className="welcome">{user.email}</p>

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

      <AccountSettings user={user} onUserChange={onUserChange} />

      <h3>Measurements and weekly goal</h3>
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

        <label>
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

        {errors.form ? <p className="error">{errors.form}</p> : null}
        {success ? <p className="success">{success}</p> : null}

        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      </form>
    </main>
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
      <h3>Account details</h3>
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
