import { useMemo, useState } from "react";
import { useAuth } from "../api/hooks/useAuth.js";
import { useUpdateUserRole, useUsers } from "../api/hooks/useUsers.js";
import "./Teams.css";

export default function Teams() {
  const { user, isAdmin, logout, refreshUser } = useAuth();
  const { data: users = [], isLoading, isError, error: usersError } = useUsers();
  const updateRole = useUpdateUserRole();
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

  const canManageRoles = !isError && isAdmin;

  if (isLoading) {
    return <main className="page loading-state"><span className="spinner" />Loading team...</main>;
  }

  if (!canManageRoles) {
    const statusCode = usersError?.response?.status;
    const lockedMessage = statusCode === 404
      ? "The Teams API is not available yet. Restart the backend server so the new users route is loaded."
      : "Only the global admin can view all users and manage team roles.";
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
    if (role === "admin" && !window.confirm(`Make ${member.username} the only global admin? Your admin access will move to this user.`)) {
      return;
    }
    setNotice("");
    setError("");
    try {
      await updateRole.mutateAsync({ id: member.id, role });
      await refreshUser();
      setNotice(
        role === "admin"
          ? `${member.username} is now the only global admin.`
          : `${member.username} is now a member.`
      );
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update role");
    }
  };

  return (
    <main className="page teams-page">
      <div className="teams-page__header">
        <div>
          <p className="teams-page__eyebrow">Admin controls</p>
          <h1>Teams</h1>
          <p className="muted">View all users and manage the single global admin role. New signups always start as members.</p>
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
