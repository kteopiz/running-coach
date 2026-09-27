import { useState } from "react";

export default function App() {
  const [page, setPage] = useState("home");

  if (page === "signup") {
    return <SignUp onBack={() => setPage("home")} />;
  }

  if (page === "signin") {
    return <SignIn onBack={() => setPage("home")} />;
  }

  return (
    <main>
      <h1>running coach app</h1>
      <button onClick={() => setPage("signin")}>Sign in</button>
      <button onClick={() => setPage("signup")}>Sign up</button>
    </main>
  );
}

function SignUp({ onBack }) {
  const [done, setDone] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setDone(true);
  }

  return (
    <main>
      <h1>running coach app</h1>
      <h2>Sign up</h2>
      {done ? (
        <p>Account created.</p>
      ) : (
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
          <button type="submit">Create account</button>
        </form>
      )}
      <button type="button" onClick={onBack}>Back</button>
    </main>
  );
}

function SignIn({ onBack }) {
  const [done, setDone] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setDone(true);
  }

  return (
    <main>
      <h1>running coach app</h1>
      <h2>Sign in</h2>
      {done ? (
        <p>Signed in.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" required />
          </label>
          <button type="submit">Sign in</button>
        </form>
      )}
      <button type="button" onClick={onBack}>Back</button>
    </main>
  );
}
