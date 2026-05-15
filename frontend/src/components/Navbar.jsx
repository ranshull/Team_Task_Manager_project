import { NavLink } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <NavLink to="/dashboard" className="navbar__brand">Team Task Manager</NavLink>
        <nav className="navbar__links">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/projects">Projects</NavLink>
        </nav>
        <div className="navbar__user">
          <span>{user?.username}</span>
          <span className="navbar__badge">{user?.role}</span>
          <button className="button secondary" onClick={logout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
