import { useMemo, useState } from "react";
import { useAuth } from "../api/hooks/useAuth.js";
import { useSignupSettings, useUpdateSignupSettings } from "../api/hooks/useSettings.js";
import { useUpdateUserRole, useUsers } from "../api/hooks/useUsers.js";
import "./Teams.css";

export default function Teams() {
  const { user, isAdmin, logout } = useAuth();
  const { data: users = [], isLoading, isError, error: usersError } = useUsers();
  const { data: signupSettings } = useSignupSettings();
  const updateRole = useUpdateUserRole();
  const updateSignupSettings = useUpdateSignupSettings();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return users;
    return users.filter((member) => (
      member.username.toLowerCase().includes(search)
      || member.email.toLowerCase().includes(search)
      || member.role.toLowerCase().includes(search)
    ));
  }, [query, users]);

  const canManageRoles = !isError && (isAdmin || users.length > 0);

  if (isLoading) {
    return <main className="page loading-state"><span className="spinner" />Loading team...</main>;
  }

  if (!canManageRoles) {
    const statusCode = usersError?.response?.status;
    const lockedMessage = statusCode === 404
      ? "The Teams API is not available yet. Restart the backend server so the new users route is loaded."
      : "Only admins can view all users and manage team roles.";
    return (
      <main className="page teams-page">
        <section className="teams-locked">
          <h1>Teams</h1>
          <p className="muted">{lockedMessage}</p>
          <div className="teams-locked__account">
            <span>Signed in as</span>
            <strong>{user?.username}</strong>
            <em>{user?.email} - {user?.role}</em>
          </div>
          <button className="button" onClick={logout}>Switch account</button>
        </section>
      </main>
    );
  }

  const changeRole = async (member, role) => {
    if (member.role === role) return;
    setNotice("");
    setError("");
    try {
      await updateRole.mutateAsync({ id: member.id, role });
      setNotice(
        role === "admin"
          ? `${member.username} is now an admin and can create projects.`
          : `${member.username} is now a member.`
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update role");
    }
  };

  const changeSignupRoleSelection = async () => {
    const nextValue = !signupSettings?.allow_signup_role_selection;
    const message = nextValue
      ? "Allow new users to choose Admin or Member during signup?"
      : "Turn off role selection during signup so new users default to Member?";
    if (!window.confirm(message)) return;
    setNotice("");
    setError("");
    try {
      await updateSignupSettings.mutateAsync({ allow_signup_role_selection: nextValue });
      setNotice(nextValue ? "Signup role selection is now enabled." : "Signup role selection is now disabled.");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update signup setting");
    }
  };

  return (
    <main className="page teams-page">
      <div className="teams-page__header">
        <div>
          <p className="teams-page__eyebrow">Admin controls</p>
          <h1>Teams</h1>
          <p className="muted">View all users and change member roles. Admins can create projects and manage workspaces.</p>
        </div>
        <label className="field teams-search">
          <span>Search team</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, or role"
          />
        </label>
      </div>

      {notice && <p className="notice success">{notice}</p>}
      {error && <p className="error">{error}</p>}

      <section className="teams-summary">
        <TeamStat label="Total users" value={users.length} />
        <TeamStat label="Admins" value={users.filter((member) => member.role === "admin").length} />
        <TeamStat label="Members" value={users.filter((member) => member.role === "member").length} />
      </section>

      <section className="signup-setting">
        <div>
          <h2>Signup role selection</h2>
          <p className="muted">Control whether new users can choose Admin or Member while creating an account.</p>
        </div>
        <button
          type="button"
          className={`toggle-switch ${signupSettings?.allow_signup_role_selection ? "is-on" : ""}`}
          title="When enabled, the signup form shows a role dropdown so users can choose Admin or Member. When disabled, new signups become Members by default."
          aria-pressed={Boolean(signupSettings?.allow_signup_role_selection)}
          disabled={updateSignupSettings.isPending}
          onClick={changeSignupRoleSelection}
        >
          <span />
          {signupSettings?.allow_signup_role_selection ? "On" : "Off"}
        </button>
      </section>

      <section className="team-table" aria-label="Team members">
        <header>
          <span>User</span>
          <span>Current role</span>
          <span>Change role</span>
        </header>
        {filteredUsers.map((member) => (
          <article key={member.id}>
            <div>
              <strong>{member.username}</strong>
              <span>{member.email}</span>
            </div>
            <em className={`role-pill role-pill--${member.role}`}>{member.role}</em>
            <div className="team-table__action">
              <select
                aria-label={`Role for ${member.username}`}
                value={member.role}
                disabled={updateRole.isPending || member.id === user?.id}
                onChange={(event) => changeRole(member, event.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              {member.id === user?.id && <span className="muted">You</span>}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function TeamStat({ label, value }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
