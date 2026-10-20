import { useState } from "react";
import { createRun, updateRun, deleteRun } from "../lib/userStore";
import { localDate, localTime, validateRunFields } from "../lib/runValidation";
import { sortRuns } from "../lib/runSort";

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

function runLabel(run) {
  const date = new Date(`${run.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const miles = Number(run.distanceMiles) === 1 ? "mile" : "miles";
  return `${date} at ${formatClock(run.startTime)}, ${run.distanceMiles} ${miles}`;
}

export default function RunHistory({ runs, loading, error, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [sort, setSort] = useState("newest");
  const ordered = sortRuns(runs, sort);

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
        setEditing({ date: localDate(), startTime: localTime(), distanceMiles: "", durationMinutes: "", notes: "" });
      }}>+ Log a run</button></div>
      <label className="sort-control">Sort
        <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort run history">
          {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {editing ? <RunForm key={editing.id || "new"} run={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} /> : null}
      {message ? <p role="status">{message}</p> : null}
      {actionError ? <p className="error" role="alert">{actionError}</p> : null}
      {loading && runs.length === 0 ? <p>Loading runs…</p> : null}
      {error ? <><p className="error" role="alert">{error}</p><button type="button" onClick={onRefresh}>Retry</button></> : null}
      {!loading && !error && runs.length === 0 ? <p>No runs yet. Log your first run to start tracking your training.</p> : null}
      {runs.length > 0 ? (
        <ul className="run-list">
          {ordered.map(run => (
            <li className="run-row" key={run.id}>
              <div className="run-date"><span className="run-icon" aria-hidden="true">↗</span><div><time dateTime={`${run.date}T${run.startTime || "12:00"}`}>{new Date(`${run.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time><span className="muted">{formatClock(run.startTime)}</span></div></div>
              <div className="run-stat"><strong>{run.distanceMiles}<span> mi</span></strong><span className="muted">Distance</span></div>
              <div className="run-stat"><strong>{run.durationMinutes ?? "—"}<span>{run.durationMinutes == null ? "" : " min"}</span></strong><span className="muted">{run.durationMinutes == null ? "Not recorded" : "Duration"}</span></div>
              {run.notes ? <p className="run-notes">{run.notes}</p> : null}
              <div className="row-actions">
              <button type="button" disabled={pending || Boolean(editing)} onClick={() => {
                setMessage("");
                setActionError("");
                setEditing(run);
              }} aria-label={`Edit run on ${runLabel(run)}`}>Edit</button>
              <button className="danger-button" type="button" disabled={pending || Boolean(editing)} onClick={() => handleDelete(run)} aria-label={`Delete run on ${runLabel(run)}`}>Delete</button></div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function RunForm({ run, onSaved, onCancel }) {
  const [fields, setFields] = useState({
    date: run.date,
    startTime: run.startTime || "",
    distanceMiles: run.distanceMiles,
    durationMinutes: run.durationMinutes ?? "",
    notes: run.notes ?? "",
  });
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    const nextErrors = validateRunFields(fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setPending(true);
    const result = run.id ? await updateRun(run.id, fields) : await createRun(fields);
    setPending(false);
    if (!result.ok) return setErrors(result.errors || { form: result.error });
    onSaved();
  }

  return (
    <form className="run-form" onSubmit={handleSubmit} noValidate aria-label={run.id ? "Edit run" : "Log a run"}>
      <h3>{run.id ? "Edit run" : "Log a run"}</h3>
      {[
        ["date", "Date", "date"],
        ["startTime", "Start time", "time"],
        ["distanceMiles", "Distance (miles)", "number"],
        ["durationMinutes", "Duration (minutes)", "number"],
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
