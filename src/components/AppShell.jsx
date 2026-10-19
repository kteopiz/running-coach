export default function AppShell({ user, page, onNavigate, children }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="app-header">
        <div className="header-inner">
          <button className="brand" onClick={() => onNavigate("dashboard")} aria-label="Running Coach dashboard">
            <span className="brand-mark" aria-hidden="true">/</span> RUNNING COACH
          </button>
          <nav className="nav" aria-label="Main navigation">
            <button aria-current={page === "dashboard" ? "page" : undefined} onClick={() => onNavigate("dashboard")}>Overview</button>
            <button aria-current={page === "profile" ? "page" : undefined} onClick={() => onNavigate("profile")}>Profile & goal</button>
          </nav>
          <div className="header-account"><span>{user.name}</span><button onClick={() => onNavigate("signout")}>Sign out</button></div>
        </div>
      </header>
      <main className="page" id="main-content">{children}</main>
    </div>
  );
}
