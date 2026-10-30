import { useEffect, useState } from "react";
import { createMeal, deleteMeal, getMeals, updateMeal } from "../lib/userStore";
import { localDate } from "../lib/runValidation";
import { MEAL_KINDS, validateMealFields } from "../lib/meals";

function formatTime(value) {
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
}

function kindLabel(kind) {
  return MEAL_KINDS.find(([value]) => value === kind)?.[1] || kind;
}

export default function MealLog({ user }) {
  const [selectedDate, setSelectedDate] = useState(localDate());
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [revision, setRevision] = useState(0);
  const today = localDate();
  const dateReady = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) && selectedDate <= today;
  const dayMeals = meals.filter((meal) => meal.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time) || a.id - b.id);

  useEffect(() => {
    let active = true;
    async function load(isRefresh) {
      if (!isRefresh) setLoading(true);
      const result = await getMeals();
      if (!active) return;
      if (!result.ok) {
        setMeals([]);
        setError(result.error || "Could not load meals.");
      } else {
        setMeals(result.meals);
        setError("");
      }
      setLoading(false);
    }
    load(false);
    const onFocus = () => load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [revision]);

  async function handleDelete(meal) {
    if (pending || !window.confirm(`Delete the ${kindLabel(meal.kind).toLowerCase()} on ${meal.date} (${meal.calories} cal)? This cannot be undone.`)) return;
    setPending(true);
    setMessage("");
    setActionError("");
    const result = await deleteMeal(meal.id);
    setPending(false);
    if (!result.ok) return setActionError(result.error);
    setMessage("Meal deleted.");
    setRevision((value) => value + 1);
  }

  function handleSaved(meal) {
    setMessage(editing.id ? "Meal updated." : "Meal logged.");
    setEditing(null);
    setSelectedDate(meal.date);
    setRevision((value) => value + 1);
  }

  return (
    <section className="panel meal-panel" aria-labelledby="meals-heading">
      <div className="section-heading">
        <div>
          <h2 id="meals-heading">Meal log</h2>
          <p className="muted">Meals and calories for the selected date.</p>
        </div>
        <label className="meal-date">
          Date
          <input type="date" max={today} value={selectedDate} disabled={Boolean(editing)} onChange={(event) => { setSelectedDate(event.target.value); setMessage(""); setActionError(""); }} />
        </label>
        <button className="primary-button" type="button" disabled={pending || Boolean(editing) || !dateReady} onClick={() => {
          setMessage("");
          setActionError("");
          setEditing({ date: selectedDate, time: "", kind: "", description: "", calories: "" });
        }}>+ Log a meal</button>
      </div>
      {!dateReady ? <p className="error" role="alert">Enter a valid meal date. Future dates are not allowed.</p> : null}
      {editing ? <MealForm key={editing.id || "new"} meal={editing} user={user} onSaved={handleSaved} onCancel={() => setEditing(null)} /> : null}
      {message ? <p role="status">{message}</p> : null}
      {actionError ? <p className="error" role="alert">{actionError}</p> : null}
      {loading ? <p>Loading meals…</p> : null}
      {error ? <><p className="error" role="alert">{error}</p><button type="button" onClick={() => setRevision((value) => value + 1)}>Retry</button></> : null}
      {!loading && !error && dateReady && dayMeals.length === 0 ? <p>No meals on this date.</p> : null}
      {!loading && !error && dayMeals.length > 0 ? (
        <ul className="run-list">
          {dayMeals.map((meal) => (
            <li className="run-row meal-row" key={meal.id}>
              <div className="run-date"><div><span>{kindLabel(meal.kind)}</span><span className="muted meal-description">{meal.description}</span></div></div>
              <div className="run-stat"><strong>{formatTime(meal.time)}</strong><span className="muted">Time</span></div>
              <div className="run-stat"><strong>{meal.calories.toLocaleString()}<span> cal</span></strong><span className="muted">Calories</span></div>
              <div className="run-stat"><strong>{meal.weightLb}<span> lb</span></strong><span className="muted">Profile weight</span></div>
              <div className="row-actions">
                <button type="button" disabled={pending || Boolean(editing)} aria-label={`Edit ${kindLabel(meal.kind).toLowerCase()} on ${meal.date}`} onClick={() => { setMessage(""); setActionError(""); setEditing(meal); }}>Edit</button>
                <button className="danger-button" type="button" disabled={pending || Boolean(editing)} aria-label={`Delete ${kindLabel(meal.kind).toLowerCase()} on ${meal.date}`} onClick={() => handleDelete(meal)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function MealForm({ meal, user, onSaved, onCancel }) {
  const [fields, setFields] = useState({
    date: meal.date,
    time: meal.time,
    kind: meal.kind,
    description: meal.description,
    calories: meal.calories,
  });
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);

  function update(name, value) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    const nextErrors = validateMealFields(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    const result = meal.id ? await updateMeal(meal.id, fields) : await createMeal(fields);
    setPending(false);
    if (!result.ok) return setErrors(result.errors || { form: result.error });
    onSaved(result.meal);
  }

  return (
    <form className="meal-form" onSubmit={handleSubmit} noValidate aria-label={meal.id ? "Edit meal" : "Log a meal"}>
      <h3>{meal.id ? "Edit meal" : "Log a meal"}</h3>
      <label>
        Date
        <input name="date" type="date" required disabled={pending} max={localDate()} value={fields.date} onChange={(event) => update("date", event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? "meal-date-error" : undefined} />
        {errors.date ? <span className="error" id="meal-date-error">{errors.date}</span> : null}
      </label>
      <label>
        Time
        <input name="time" type="time" required disabled={pending} step="60" value={fields.time} onChange={(event) => update("time", event.target.value)} aria-invalid={Boolean(errors.time)} aria-describedby={errors.time ? "meal-time-error" : undefined} />
        {errors.time ? <span className="error" id="meal-time-error">{errors.time}</span> : null}
      </label>
      <label>
        Meal type
        <select name="kind" required disabled={pending} value={fields.kind} onChange={(event) => update("kind", event.target.value)} aria-invalid={Boolean(errors.kind)} aria-describedby={errors.kind ? "meal-kind-error" : undefined}>
          <option value="">Choose a meal</option>
          {MEAL_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {errors.kind ? <span className="error" id="meal-kind-error">{errors.kind}</span> : null}
      </label>
      <label>
        Calories
        <input name="calories" type="number" required disabled={pending} min="1" max="10000" step="1" value={fields.calories} onChange={(event) => update("calories", event.target.value)} aria-invalid={Boolean(errors.calories)} aria-describedby={errors.calories ? "meal-calories-error" : undefined} />
        {errors.calories ? <span className="error" id="meal-calories-error">{errors.calories}</span> : null}
      </label>
      <label className="wide">
        Description
        <input name="description" type="text" required disabled={pending} maxLength="200" value={fields.description} onChange={(event) => update("description", event.target.value)} aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? "meal-description-error" : undefined} />
        {errors.description ? <span className="error" id="meal-description-error">{errors.description}</span> : null}
      </label>
      <p className="weight-note">{meal.id ? `Profile weight recorded with this meal: ${meal.weightLb} lb. Editing does not change it.` : `Profile weight saved with this meal: ${user.weight} lb. This comes from your profile.`}</p>
      {errors.form ? <p className="error" role="alert">{errors.form}</p> : null}
      <div className="form-actions">
        <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save meal"}</button>
        <button type="button" disabled={pending} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
