import AppShell from "../components/AppShell";
import { useEffect, useState } from "react";
import { CALORIE_ESTIMATE_NOTE, estimateDailyCalories } from "../lib/calories";
import { MEASUREMENT_MIN, getCalorieGoals, updateCurrentAccount, updateCurrentUser, validateProfileFields } from "../lib/userStore";
import { formatCalories } from "../lib/format";
import UnitSystemField from "../components/UnitSystemField";
import HeightFields from "../components/HeightFields";
import { convertDistanceEntry, convertHeightEntry, distanceInputValue, heightFieldsFromInches, inchesFromHeightEntry, milesFromDistanceEntry, weeklyGoalLabel } from "../lib/units";

export default function Profile({ user, onUserChange, onNavigate }) {
  const [unitSystem, setUnitSystem] = useState(user.unitSystem === "metric" ? "metric" : "imperial");
  const startingHeight = heightFieldsFromInches(user.height, user.unitSystem === "metric" ? "metric" : "imperial");
  const [feet, setFeet] = useState(startingHeight.feet);
  const [inchPart, setInchPart] = useState(startingHeight.inches);
  const [centimeters, setCentimeters] = useState(startingHeight.centimeters);
  const [age, setAge] = useState(String(user.age ?? ""));
  const [weight, setWeight] = useState(String(user.weight ?? ""));
  const [weeklyGoal, setWeeklyGoal] = useState(
    user.weeklyMileageGoal !== null && user.weeklyMileageGoal !== undefined
      ? distanceInputValue(user.weeklyMileageGoal, user.unitSystem === "metric" ? "metric" : "imperial")
      : ""
  );
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(
    user.dailyCalorieGoal != null ? String(user.dailyCalorieGoal) : ""
  );
  const [errors, setErrors] = useState({});
  const [historyRevision, setHistoryRevision] = useState(0);
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const heightEntry = { unitSystem, feet, inches: inchPart, centimeters };
  const heightInches = inchesFromHeightEntry(heightEntry).inches;
  const goalMiles = milesFromDistanceEntry(weeklyGoal, unitSystem).miles;
  const calorieEstimate = estimateDailyCalories({ age, height: heightInches, weight, weeklyMileageGoal: goalMiles });

  function changeUnits(next) {
    if (next === unitSystem) return;
    const converted = convertHeightEntry(heightEntry, next);
    const convertedGoal = convertDistanceEntry(weeklyGoal, unitSystem, next);
    if (converted.error || convertedGoal.error) {
      setErrors((current) => ({ ...current, height: converted.error, weeklyMileageGoal: convertedGoal.error }));
      return;
    }
    setUnitSystem(next);
    setFeet(converted.feet);
    setInchPart(converted.inches);
    setCentimeters(converted.centimeters);
    setWeeklyGoal(convertedGoal.value);
    setErrors((current) => ({ ...current, height: undefined, weeklyMileageGoal: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setSuccess("");
    const parsedHeight = inchesFromHeightEntry(heightEntry);
    const parsedGoal = milesFromDistanceEntry(weeklyGoal, unitSystem);
    const nextErrors = validateProfileFields({
      age,
      height: parsedHeight.inches ?? "",
      weight,
      weeklyMileageGoal: parsedGoal.miles ?? "",
      dailyCalorieGoal,
    });
    if (parsedHeight.error) nextErrors.height = parsedHeight.error;
    if (parsedGoal.error) nextErrors.weeklyMileageGoal = parsedGoal.error;
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setPending(true);
    const result = await updateCurrentUser({
      age: Number(age),
      height: parsedHeight.inches,
      weight: Number(weight),
      weeklyMileageGoal: parsedGoal.miles,
      dailyCalorieGoal: dailyCalorieGoal === "" ? null : Number(dailyCalorieGoal),
      unitSystem,
    });
    setPending(false);

    if (!result.ok) {
      setErrors({ form: result.error });
      return;
    }

    onUserChange(result.user);
    setHistoryRevision((revision) => revision + 1);
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
        <UnitSystemField value={unitSystem} onChange={changeUnits} disabled={pending} />
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

        <HeightFields
          unitSystem={unitSystem}
          feet={feet}
          inches={inchPart}
          centimeters={centimeters}
          onFeet={setFeet}
          onInches={setInchPart}
          onCentimeters={setCentimeters}
          error={errors.height}
          disabled={pending}
        />

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
          {weeklyGoalLabel(unitSystem)}
          <input
            name="weeklyMileageGoal"
            type="number"
            min="0.1"
            step="0.01"
            value={weeklyGoal}
            onChange={(event) => setWeeklyGoal(event.target.value)}
            aria-invalid={Boolean(errors.weeklyMileageGoal)}
          />
          {errors.weeklyMileageGoal ? (
            <span className="error">{errors.weeklyMileageGoal}</span>
          ) : null}
        </label>
        {calorieEstimate ? <p className="muted">{calorieEstimate.label}: {formatCalories(calorieEstimate.calories)} cal a day. {CALORIE_ESTIMATE_NOTE}</p> : <p className="muted">Enter a weekly mileage goal to see the educational calorie estimate.</p>}

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
      <CalorieGoalHistory revision={historyRevision} />
      </section>
      </div>
    </AppShell>
  );
}

function formatDay(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function CalorieGoalHistory({ revision }) {
  const [goals, setGoals] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    getCalorieGoals().then((result) => {
      if (!active) return;
      if (!result.ok) setLoadError(result.error || "Could not load calorie goals.");
      else setGoals(result.goals || []);
    });
    return () => { active = false; };
  }, [revision]);

  return (
    <details className="calorie-goals">
      <summary>Calorie goal history</summary>
      {loadError ? <p className="error" role="alert">{loadError}</p> : null}
      {goals.length === 0 ? <p className="muted">No calorie goals yet.</p> : (
        <ul className="goal-history">
          {goals.map((goal) => (
            <li key={goal.id}>
              <time dateTime={goal.effectiveDate}>{formatDay(goal.effectiveDate)}</time>
              <span>Age {goal.age}</span>
              <strong>{goal.calories == null ? "Goal cleared" : `${formatCalories(goal.calories)} cal`}</strong>
            </li>
          ))}
        </ul>
      )}
    </details>
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
