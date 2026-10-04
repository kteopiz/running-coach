import { useState } from "react";
import { resetPassword } from "../lib/userStore";

export default function ForgotPassword({ onBack }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    const result = await resetPassword({
      email: form.get("email"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    formElement.reset();
    setSuccess(true);
  }

  return (
    <main>
      <h1>running coach app</h1>
      <h2>Reset password</h2>
      {success ? (
        <p className="success" role="status">Password reset. Sign in with your new password.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>
            Account email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            New password
            <input name="password" type="password" autoComplete="new-password" required />
          </label>
          <label>
            Confirm new password
            <input name="confirmPassword" type="password" autoComplete="new-password" required />
          </label>
          {error ? <p className="error" role="alert">{error}</p> : null}
          <button type="submit" disabled={pending}>{pending ? "Resetting…" : "Reset password"}</button>
        </form>
      )}
      <button type="button" onClick={onBack}>Back to sign in</button>
    </main>
  );
}
