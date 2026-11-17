import AppShell from "../components/AppShell";
import HeightFields from "../components/HeightFields";
import UnitSystemField from "../components/UnitSystemField";
import { useEffect, useState } from "react";
import { CALORIE_ESTIMATE_NOTE, calorieEstimateUnavailable, calorieGoalOn, estimateDailyCalories, upcomingCalorieGoal, validateCalorieGoal } from "../lib/calories";
import { formatCalories } from "../lib/format";
import { localDate } from "../lib/runValidation";
import { convertDistanceEntry, convertHeightEntry, displayedDistanceBounds, distanceInputValue, distanceRangeMessage, heightFieldsFromInches, heightRangeMessage, inchesFromHeightEntry, milesFromDistanceEntry, weeklyGoalLabel } from "../lib/units";
import { INPUT_LIMITS, deleteCalorieGoal, getCalorieGoals, saveCalorieGoal, updateCurrentAccount, updateCurrentUser, validateProfileFields } from "../lib/userStore";

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

  useEffect(() => {
    setDailyCalorieGoal(user.dailyCalorieGoal != null ? String(user.dailyCalorieGoal) : "");
  }, [user.dailyCalorieGoal]);

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
    setErrors(showLimitsInUnits(nextErrors, unitSystem));
    if (Object.keys(nextErrors).length > 0) return;

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
      setErrors(showLimitsInUnits(result.errors || { form: result.error }, unitSystem));
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
          <h2>Measurements & goals</h2>
          <p className="muted section-description">Keep your profile current, set a distance to work toward, and set a daily calorie goal.</p>
          <form onSubmit={handleSubmit} noValidate>
            <UnitSystemField value={unitSystem} onChange={changeUnits} disabled={pending} />
            <label>
              Age
              <input name="age" type="number" min={INPUT_LIMITS.minAge} max={INPUT_LIMITS.maxAge} step="1" value={age} onChange={(event) => { setAge(event.target.value); setErrors((current) => ({ ...current, age: undefined })); }} aria-invalid={Boolean(errors.age)} />
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
              <input name="weight" type="number" min={INPUT_LIMITS.minWeightLb} max={INPUT_LIMITS.maxWeightLb} step="0.1" value={weight} onChange={(event) => { setWeight(event.target.value); setErrors((current) => ({ ...current, weight: undefined })); }} aria-invalid={Boolean(errors.weight)} />
              {errors.weight ? <span className="error">{errors.weight}</span> : null}
            </label>
            <label className="weekly-goal-field">
              {weeklyGoalLabel(unitSystem)}
              <input name="weeklyMileageGoal" type="number" min={displayedDistanceBounds(unitSystem).min} max={displayedDistanceBounds(unitSystem).max} step="0.01" value={weeklyGoal} onChange={(event) => { setWeeklyGoal(event.target.value); setErrors((current) => ({ ...current, weeklyMileageGoal: undefined })); }} aria-invalid={Boolean(errors.weeklyMileageGoal)} />
              {errors.weeklyMileageGoal ? <span className="error">{errors.weeklyMileageGoal}</span> : null}
            </label>
            {calorieEstimate ? <p className="muted">{calorieEstimate.label}: {formatCalories(calorieEstimate.calories)} cal a day. {CALORIE_ESTIMATE_NOTE}</p> : <p className="muted">{weeklyGoal === "" ? "Enter a weekly mileage goal to see the educational calorie estimate." : calorieEstimateUnavailable(unitSystem)}</p>}
            <label className="weekly-goal-field">
              Daily calorie goal (calories)
              <input name="dailyCalorieGoal" type="number" min="1" max="10000" step="1" value={dailyCalorieGoal} onChange={(event) => { setDailyCalorieGoal(event.target.value); setErrors((current) => ({ ...current, dailyCalorieGoal: undefined })); }} aria-invalid={Boolean(errors.dailyCalorieGoal)} />
              {errors.dailyCalorieGoal ? <span className="error">{errors.dailyCalorieGoal}</span> : null}
              <span className="account-help">Optional. Meal logging uses the goal saved for the selected day, and this number when that day has no dated goal. Leave it blank to clear it.</span>
            </label>
            {errors.form ? <p className="error">{errors.form}</p> : null}
            {success ? <p className="success">{success}</p> : null}
            <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
          </form>
        </section>
      </div>
      <CalorieGoals revision={historyRevision} onUserChange={onUserChange} />
    </AppShell>
  );
}

function showLimitsInUnits(errors, unitSystem) {
  const next = { ...errors };
  if (next.height?.includes("must be from")) next.height = heightRangeMessage(unitSystem);
  if (next.weeklyMileageGoal?.includes("must be from")) next.weeklyMileageGoal = distanceRangeMessage(unitSystem, "Weekly mileage goal");
  return next;
}

function formatDay(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function calorieAmount(calories) {
  return calories == null ? "Goal cleared" : `${formatCalories(calories)} cal`;
}

function CalorieGoals({ revision, onUserChange }) {
  const [goals, setGoals] = useState([]);
  const [effectiveDate, setEffectiveDate] = useState(localDate());
  const [calories, setCalories] = useState("");
  const [lookupDate, setLookupDate] = useState(localDate());
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    getCalorieGoals().then((result) => {
      if (!active) return;
      if (!result.ok) setLoadError(result.error || "Could not load calorie goals.");
      else {
        setGoals(result.goals || []);
        setLoadError("");
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [revision]);

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
    if (result.user) onUserChange?.(result.user);
    setCalories("");
    setMessage("Calorie goal saved.");
  }

  async function handleDelete(goal) {
    if (pending || !window.confirm(`Delete the calorie goal for ${formatDay(goal.effectiveDate)}? This cannot be undone.`)) return;
    setMessage("");
    setPending(true);
    const result = await deleteCalorieGoal(goal.id);
    setPending(false);
    if (!result.ok) return setErrors({ form: result.error });
    setGoals(result.goals || []);
    if (result.user) onUserChange?.(result.user);
    setMessage("Calorie goal deleted.");
  }

  const today = localDate();
  const onDate = calorieGoalOn(goals, lookupDate);
  const upcoming = onDate ? null : upcomingCalorieGoal(goals, lookupDate);
  const lookupText = onDate
    ? `${calorieAmount(onDate.calories)} from the goal saved on ${formatDay(onDate.effectiveDate)} at age ${onDate.age}. This goal is active on the selected date.`
    : upcoming
      ? `No calorie goal applies yet. A goal of ${calorieAmount(upcoming.calories)} starts on ${formatDay(upcoming.effectiveDate)} and stays inactive until then.`
      : "No calorie goal was set on or before this date.";

  return (
    <section className="panel calorie-goals" aria-labelledby="calorie-goal-heading">
      <h2 id="calorie-goal-heading">Calorie goals</h2>
      <p className="muted section-description">Save the calorie goal for a date. A goal stays inactive until that date, then it applies to that day and the days after it until a later goal takes over. Earlier goals stay on record, including the age on your profile when you saved them.</p>
      <form className="goal-form" onSubmit={handleSubmit} noValidate>
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
      <label className="timeline-date">
        Goal on this date
        <input type="date" value={lookupDate} onChange={(event) => setLookupDate(event.target.value)} />
      </label>
      <p className="muted">{lookupText}</p>
      {loadError ? <p className="error" role="alert">{loadError}</p> : null}
      {loaded && !loadError && goals.length === 0 ? <p className="muted">No calorie goals yet.</p> : null}
      {goals.length > 0 ? (
        <ul className="goal-history">
          {goals.map((goal) => (
            <li key={goal.id}>
              <time dateTime={goal.effectiveDate}>{formatDay(goal.effectiveDate)}</time>
              <span>{goal.effectiveDate > today ? "Not yet active" : "Active"}</span>
              <span>Age {goal.age}</span>
              <strong>{calorieAmount(goal.calories)}</strong>
              <button type="button" onClick={() => handleDelete(goal)} disabled={pending}>Delete</button>
            </li>
          ))}
        </ul>
      ) : null}
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
      <h2>Account details</h2>
      <p className="muted section-description">Manage your email and password.</p>
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
