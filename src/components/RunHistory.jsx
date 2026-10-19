import { useState } from "react";
import { createRun, updateRun, deleteRun } from "../lib/userStore";
import { localDate, validateRunFields } from "../lib/runValidation";

export default function RunHistory({ runs, loading, error, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  async function handleDelete(run) {
    if (pending || !window.confirm(`Delete the run on ${run.date} (${run.distanceMiles} miles)? This cannot be undone.`)) return;
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
    <section className="panel" aria-labelledby="runs-heading">
      <h3 id="runs-heading">Run history</h3>
      <button type="button" disabled={pending || Boolean(editing)} onClick={() => {
        setMessage("");
        setActionError("");
        setEditing({ date: localDate(), distanceMiles: "", durationMinutes: "" });
      }}>Log a run</button>
      {editing ? <RunForm key={editing.id || "new"} run={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} /> : null}
      {message ? <p role="status">{message}</p> : null}
      {actionError ? <p className="error" role="alert">{actionError}</p> : null}
      {loading ? <p>Loading runs…</p> : null}
      {error ? <><p className="error" role="alert">{error}</p><button type="button" onClick={onRefresh}>Retry</button></> : null}
      {!loading && !error && runs.length === 0 ? <p>No runs yet. Log your first run to start tracking your training.</p> : null}
      {!loading && !error && runs.length > 0 ? (
        <ul>
          {runs.map(run => (
            <li key={run.id}>
              <p><time dateTime={run.date}>{run.date}</time> — {run.distanceMiles} miles — {run.durationMinutes == null ? "Duration: Not recorded" : `${run.durationMinutes} minutes`}</p>
              <button type="button" disabled={pending || Boolean(editing)} onClick={() => {
                setMessage("");
                setActionError("");
                setEditing(run);
              }} aria-label={`Edit run on ${run.date}`}>Edit</button>
              <button type="button" disabled={pending || Boolean(editing)} onClick={() => handleDelete(run)} aria-label={`Delete run on ${run.date}`}>Delete</button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function RunForm({ run, onSaved, onCancel }) {
  const [fields, setFields] = useState({ date: run.date, distanceMiles: run.distanceMiles, durationMinutes: run.durationMinutes ?? "" });
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
    <form onSubmit={handleSubmit} noValidate aria-label={run.id ? "Edit run" : "Log a run"}>
      <h3>{run.id ? "Edit run" : "Log a run"}</h3>
      {[
        ["date", "Date", "date"],
        ["distanceMiles", "Distance (miles)", "number"],
        ["durationMinutes", "Duration (minutes)", "number"],
      ].map(([name, label, type]) => (
        <label key={name}>
          {label}
          <input name={name} type={type} required disabled={pending}
            max={type === "date" ? localDate() : undefined}
            min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined}
            value={fields[name]} onChange={event => setFields({ ...fields, [name]: event.target.value })}
            aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `run-${name}-error` : undefined} />
          {errors[name] ? <span className="error" id={`run-${name}-error`}>{errors[name]}</span> : null}
        </label>
      ))}
      {errors.form ? <p className="error" role="alert">{errors.form}</p> : null}
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save run"}</button>
      <button type="button" disabled={pending} onClick={onCancel}>Cancel</button>
    </form>
  );
}
