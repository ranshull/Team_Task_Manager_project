import { Link } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import "./Landing.css";

export default function Landing() {
  const { isAuthenticated, user, logout } = useAuth();
  const primaryPath = isAuthenticated ? "/dashboard" : "/signup";
  const primaryLabel = isAuthenticated ? "Open dashboard" : "Start managing work";

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Landing navigation">
        <Link to="/" className="landing-nav__brand">Team Task Manager</Link>
        {isAuthenticated ? (
          <div className="landing-nav__user">
            <div>
              <strong>{user?.username}</strong>
              <span>{user?.email} - {user?.role}</span>
            </div>
            <Link className="button secondary" to="/dashboard">Dashboard</Link>
            <button className="button" onClick={logout}>Logout</button>
          </div>
        ) : (
          <div className="landing-nav__links">
            <Link to="/login">Sign in</Link>
            <Link className="button" to={primaryPath}>{primaryLabel}</Link>
          </div>
        )}
      </nav>

      <section className="landing-hero">
        <div className="landing-hero__content">
          <p className="landing-kicker">Project clarity for fast-moving teams</p>
          <h1>Plan, assign, and finish team work from one focused board.</h1>
          <p className="landing-copy">
            A lightweight project hub with role-based access, kanban task tracking,
            dashboard metrics, and task comments built into the same workflow.
          </p>
          <div className="landing-actions">
            <Link className="button" to={primaryPath}>{primaryLabel}</Link>
            {isAuthenticated ? (
              <button className="button secondary" onClick={logout}>Logout</button>
            ) : (
              <Link className="button secondary" to="/login">Sign in</Link>
            )}
          </div>
        </div>

        <div className="landing-preview" aria-label="Task manager preview">
          <div className="landing-preview__topbar">
            <span />
            <strong>Launch Plan</strong>
            <small>76% complete</small>
          </div>
          <div className="landing-preview__stats">
            <PreviewStat label="Tasks" value="42" />
            <PreviewStat label="Done" value="32" />
            <PreviewStat label="Overdue" value="3" />
          </div>
          <div className="landing-preview__board">
            <PreviewColumn title="To do" count="8" tone="blue" />
            <PreviewColumn title="In progress" count="7" tone="amber" />
            <PreviewColumn title="Done" count="32" tone="green" />
          </div>
        </div>
      </section>

      <section className="landing-strip" aria-label="Core capabilities">
        <span>JWT authentication</span>
        <span>Admin and member roles</span>
        <span>Projects, tasks, and comments</span>
      </section>
    </main>
  );
}

function PreviewStat({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PreviewColumn({ title, count, tone }) {
  return (
    <article className={`landing-preview__column landing-preview__column--${tone}`}>
      <header>
        <span>{title}</span>
        <strong>{count}</strong>
      </header>
      <div />
      <div />
      <div />
    </article>
  );
}
