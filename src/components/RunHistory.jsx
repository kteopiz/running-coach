import { useState } from "react";
import { createRun, updateRun, deleteRun } from "../lib/userStore";
import { localDate, localTime, validateRunFields } from "../lib/runValidation";
import { sortRuns } from "../lib/runSort";
import { distanceFieldLabel, distanceInputValue, distanceUnitName, distanceUnitShort, formatDistanceAmount, milesFromDistanceEntry } from "../lib/units";

const PAGE_SIZE = 5;

const SORTS = [
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["distance-desc", "Longest distance"],
  ["distance-asc", "Shortest distance"],
  ["duration-desc", "Longest duration"],
  ["duration-asc", "Shortest duration"],
];

function formatClock(value) {
  if (!value) return "Time not recorded";
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function runLabel(run, unitSystem) {
  const date = new Date(`${run.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const amount = formatDistanceAmount(run.distanceMiles, unitSystem);
  const name = amount === "1" && distanceUnitName(unitSystem) === "miles" ? "mile" : distanceUnitName(unitSystem);
  return `${date} at ${formatClock(run.startTime)}, ${amount} ${name}`;
}

export default function RunHistory({ runs, loading, error, onRefresh, unitSystem = "imperial" }) {
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [sort, setSort] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const ordered = sortRuns(runs, sort);
  const visible = ordered.slice(0, visibleCount);
  const hiddenCount = ordered.length - visible.length;

  async function handleDelete(run) {
    if (pending || !window.confirm(`Delete the run on ${runLabel(run)}? This cannot be undone.`)) return;
    setPending(true);
    setMessage("");
    setActionError("");
    const result = await deleteRun(run.id);
    setPending(false);
    if (!result.ok) return setActionError(result.error);
    setMessage("Run deleted.");
    onRefresh();
  }

  function handleSaved() {
    setMessage(editing.id ? "Run updated." : "Run logged.");
    setEditing(null);
    onRefresh();
  }

  return (
    <section className="panel history-panel" aria-labelledby="runs-heading">
      <div className="section-heading"><div><h2 id="runs-heading">Run history</h2><p className="muted">Your training, one run at a time.</p></div>
      <button className="primary-button" type="button" disabled={pending || Boolean(editing)} onClick={() => {
        setMessage("");
        setActionError("");
        setEditing({ date: localDate(), startTime: localTime(), distanceMiles: "", durationMinutes: "", notes: "", unitSystem });
      }}>Log a run</button></div>
      <label className="sort-control">Sort
        <select value={sort} onChange={(event) => { setSort(event.target.value); setVisibleCount(PAGE_SIZE); }} aria-label="Sort run history">
          {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {editing ? <RunForm key={`${editing.id || "new"}-${unitSystem}`} run={editing} unitSystem={unitSystem} onSaved={handleSaved} onCancel={() => setEditing(null)} /> : null}
      {message ? <p role="status">{message}</p> : null}
      {actionError ? <p className="error" role="alert">{actionError}</p> : null}
      {loading && runs.length === 0 ? <p>Loading runs…</p> : null}
      {error ? <><p className="error" role="alert">{error}</p><button type="button" onClick={onRefresh}>Retry</button></> : null}
      {!loading && !error && runs.length === 0 ? <p>No runs yet. Log your first run to start tracking your training.</p> : null}
      {runs.length > 0 ? (
        <>
        {ordered.length > PAGE_SIZE ? <p className="muted">Showing {visible.length} of {ordered.length}.</p> : null}
        <ul className="run-list">
          {visible.map(run => (
            <li className="run-row" key={run.id}>
              <div className="run-date"><span className="run-icon" aria-hidden="true">↗</span><div><time dateTime={`${run.date}T${run.startTime || "12:00"}`}>{new Date(`${run.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time><span className="muted">{formatClock(run.startTime)}</span></div></div>
              <div className="run-stat"><strong>{formatDistanceAmount(run.distanceMiles, unitSystem)}<span> {distanceUnitShort(unitSystem)}</span></strong><span className="muted">Distance</span></div>
              <div className="run-stat"><strong>{run.durationMinutes ?? "—"}<span>{run.durationMinutes == null ? "" : " min"}</span></strong><span className="muted">{run.durationMinutes == null ? "Not recorded" : "Duration"}</span></div>
              {run.notes ? <p className="run-notes">{run.notes}</p> : null}
              <div className="row-actions">
              <button type="button" disabled={pending || Boolean(editing)} onClick={() => {
                setMessage("");
                setActionError("");
                setEditing(run);
              }} aria-label={`Edit run on ${runLabel(run, unitSystem)}`}>Edit</button>
              <button className="danger-button" type="button" disabled={pending || Boolean(editing)} onClick={() => handleDelete(run)} aria-label={`Delete run on ${runLabel(run, unitSystem)}`}>Delete</button></div>
            </li>
          ))}
        </ul>
        {hiddenCount > 0 ? <button className="history-more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, hiddenCount)} more</button> : null}
        </>
      ) : null}
    </section>
  );
}

function RunForm({ run, unitSystem = "imperial", onSaved, onCancel }) {
  const [fields, setFields] = useState({
    date: run.date,
    startTime: run.startTime || "",
    distance: run.distanceMiles === "" || run.distanceMiles == null ? "" : distanceInputValue(run.distanceMiles, unitSystem),
    durationMinutes: run.durationMinutes ?? "",
    notes: run.notes ?? "",
  });
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    const parsed = milesFromDistanceEntry(fields.distance, unitSystem);
    const nextErrors = validateRunFields({ ...fields, distanceMiles: parsed.miles ?? 1 });
    if (parsed.error) nextErrors.distance = parsed.error;
    else if (nextErrors.distanceMiles) nextErrors.distance = nextErrors.distanceMiles;
    delete nextErrors.distanceMiles;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    const payload = { date: fields.date, startTime: fields.startTime, distanceMiles: parsed.miles, durationMinutes: fields.durationMinutes, notes: fields.notes };
    const result = run.id ? await updateRun(run.id, payload) : await createRun(payload);
    setPending(false);
    if (!result.ok) {
      const serverErrors = result.errors || { form: result.error };
      if (serverErrors.distanceMiles) serverErrors.distance = serverErrors.distanceMiles;
      return setErrors(serverErrors);
    }
    onSaved();
  }

  return (
    <form className="run-form" onSubmit={handleSubmit} noValidate aria-label={run.id ? "Edit run" : "Log a run"}>
      <h3>{run.id ? "Edit run" : "Log a run"}</h3>
      {[
        ["date", "Date", "date"],
        ["startTime", "Start time", "time"],
      ].map(([name, label, type]) => (
        <label key={name}>
          {label}
          <input name={name} type={type} required disabled={pending} autoFocus={name === "date"}
            max={type === "date" ? localDate() : undefined}
            min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined}
            value={fields[name]} onChange={event => setFields({ ...fields, [name]: event.target.value })}
            aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `run-${name}-error` : undefined} />
          {errors[name] ? <span className="error" id={`run-${name}-error`}>{errors[name]}</span> : null}
        </label>
      ))}
      <label>
        {distanceFieldLabel(unitSystem)}
        <input name="distance" type="number" required disabled={pending} min="0" step="any" value={fields.distance} onChange={(event) => setFields({ ...fields, distance: event.target.value })} aria-invalid={Boolean(errors.distance)} aria-describedby={errors.distance ? "run-distance-error" : undefined} />
        {errors.distance ? <span className="error" id="run-distance-error">{errors.distance}</span> : null}
      </label>
      <label>
        Duration (minutes)
        <input name="durationMinutes" type="number" required disabled={pending} min="0" step="any" value={fields.durationMinutes} onChange={(event) => setFields({ ...fields, durationMinutes: event.target.value })} aria-invalid={Boolean(errors.durationMinutes)} aria-describedby={errors.durationMinutes ? "run-durationMinutes-error" : undefined} />
        {errors.durationMinutes ? <span className="error" id="run-durationMinutes-error">{errors.durationMinutes}</span> : null}
      </label>
      <label className="notes-field">
        Notes
        <textarea name="notes" rows={3} maxLength={500} disabled={pending} value={fields.notes}
          onChange={event => setFields({ ...fields, notes: event.target.value })}
          aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? "run-notes-error" : undefined} />
        {errors.notes ? <span className="error" id="run-notes-error">{errors.notes}</span> : null}
      </label>
      {errors.form ? <p className="error" role="alert">{errors.form}</p> : null}
      <div className="form-actions"><button type="submit" disabled={pending}>{pending ? "Saving…" : "Save run"}</button>
      <button type="button" disabled={pending} onClick={onCancel}>Cancel</button></div>
    </form>
  );
}
