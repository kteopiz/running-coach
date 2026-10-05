import { useEffect, useState } from "react";
import {
  authenticateUser,
  clearSession,
  getCurrentUser,
  MEASUREMENT_MIN,
  registerUser,
} from "./lib/userStore";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser().then((result) => {
      if (!active) return;
      if (result.ok) {
        setUser(result.user);
        setPage(result.user ? "dashboard" : "home");
      } else setError(result.error);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function handleNavigate(nextPage) {
    if (nextPage === "signout") {
      const result = await clearSession();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUser(null);
      setPage("home");
      return;
    }
    setPage(nextPage);
  }

  if (loading) return <main><p>Loading your account…</p></main>;
  if (error) return <main><p className="error" role="alert">{error}</p><button onClick={() => window.location.reload()}>Retry</button></main>;

  if (user && page === "dashboard") {
    return (
      <Dashboard
        user={user}
        onNavigate={handleNavigate}
      />
    );
  }

  if (user && page === "profile") {
    return (
      <Profile
        user={user}
        onUserChange={setUser}
        onNavigate={handleNavigate}
      />
    );
  }

  if (page === "signup") {
    return (
      <SignUp
        onBack={() => setPage("home")}
        onSuccess={(nextUser) => {
          setUser(nextUser);
          setPage("profile");
        }}
      />
    );
  }

  if (page === "signin") {
    return (
      <SignIn
        onForgotPassword={() => setPage("forgotPassword")}
        onBack={() => setPage("home")}
        onSuccess={(nextUser) => {
          setUser(nextUser);
          setPage("dashboard");
        }}
      />
    );
  }

  if (page === "forgotPassword") {
    return <ForgotPassword onBack={() => setPage("signin")} />;
  }

  return (
    <main>
      <h1>running coach app</h1>
      <button type="button" onClick={() => setPage("signin")}>
        Sign in
      </button>
      <button type="button" onClick={() => setPage("signup")}>
        Sign up
      </button>
    </main>
  );
}

function SignUp({ onBack, onSuccess }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const result = await registerUser({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      age: form.get("age"),
      height: form.get("height"),
      weight: form.get("weight"),
    });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSuccess(result.user);
  }

  return (
    <main>
      <h1>running coach app</h1>
      <h2>Sign up</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Full name
          <input name="name" type="text" required />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <label>
          Age
          <input name="age" type="number" min="1" required />
        </label>
        <label>
          Height (inches)
          <input name="height" type="number" min={MEASUREMENT_MIN} step="0.1" required />
        </label>
        <label>
          Weight (lb)
          <input name="weight" type="number" min={MEASUREMENT_MIN} step="0.1" required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
      </form>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}

function SignIn({ onBack, onSuccess, onForgotPassword }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const result = await authenticateUser(form.get("email"), form.get("password"));
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onSuccess(result.user);
  }

  return (
    <main>
      <h1>running coach app</h1>
      <h2>Sign in</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
      </form>
      <button type="button" onClick={onForgotPassword}>
        Forgot password?
      </button>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
