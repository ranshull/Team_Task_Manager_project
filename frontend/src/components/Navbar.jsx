import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <span className="navbar__mark">TT</span>
          <span>Team Task Manager</span>
        </Link>
        <nav className="navbar__toggle" aria-label="Primary">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/teams">Teams</NavLink>
        </nav>
        <div className="navbar__user">
          <div>
            <strong>{user?.username}</strong>
            <span className="navbar__badge">{user?.role}</span>
          </div>
          <button className="button secondary" onClick={logout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
