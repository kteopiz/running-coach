import { useState } from "react";
import {
  authenticateUser,
  clearSession,
  getCurrentUser,
  registerUser,
} from "./lib/userStore";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";

export default function App() {
  const [user, setUser] = useState(() => getCurrentUser());
  const [page, setPage] = useState(() => (getCurrentUser() ? "dashboard" : "home"));

  function handleNavigate(nextPage) {
    if (nextPage === "signout") {
      clearSession();
      setUser(null);
      setPage("home");
      return;
    }
    setPage(nextPage);
  }

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
        onBack={() => setPage("home")}
        onSuccess={(nextUser) => {
          setUser(nextUser);
          setPage("dashboard");
        }}
      />
    );
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

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);
    const result = registerUser({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      age: form.get("age"),
      height: form.get("height"),
      weight: form.get("weight"),
    });

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
          Height (feet)
          <input name="height" type="number" min="1" step="0.1" required />
        </label>
        <label>
          Weight (lb)
          <input name="weight" type="number" min="1" step="0.1" required />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">Create account</button>
      </form>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}

function SignIn({ onBack, onSuccess }) {
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const form = new FormData(event.currentTarget);
    const result = authenticateUser(form.get("email"), form.get("password"));

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
        <button type="submit">Sign in</button>
      </form>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </main>
  );
}
