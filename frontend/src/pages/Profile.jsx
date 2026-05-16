import { useEffect, useState } from "react";
import { useAuth } from "../api/hooks/useAuth.js";
import "./Profile.css";

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", phone: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ username: user.username || "", phone: user.phone || "" });
    }
  }, [user]);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");
    setIsSaving(true);
    try {
      await updateProfile(form);
      setNotice("Profile updated successfully.");
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="page profile-page">
      <section className="profile-card">
        <div className="profile-card__header">
          <div className="profile-avatar">{initials(user?.username)}</div>
          <div>
            <p className="profile-card__eyebrow">User profile</p>
            <h1>{user?.username}</h1>
            <p className="muted">{user?.email}</p>
          </div>
          <button className="button secondary" onClick={() => setEditing((current) => !current)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {notice && <p className="notice success">{notice}</p>}
        {error && <p className="error">{error}</p>}

        {!editing ? (
          <div className="profile-grid">
            <ProfileItem label="Name" value={user?.username} />
            <ProfileItem label="Email" value={user?.email} />
            <ProfileItem label="Phone" value={user?.phone || "Not added"} />
            <ProfileItem label="Role" value={user?.role} />
          </div>
        ) : (
          <form className="profile-form" onSubmit={submit}>
            <label className="field"><span>Name</span><input value={form.username} onChange={update("username")} required minLength="3" /></label>
            <label className="field"><span>Phone</span><input value={form.phone} onChange={update("phone")} placeholder="Add phone number" /></label>
            <div className="profile-form__readonly">
              <ProfileItem label="Email" value={user?.email} />
              <ProfileItem label="Role" value={user?.role} />
            </div>
            <button className="button button--loading" disabled={isSaving}>
              {isSaving && <span className="spinner" />}
              {isSaving ? "Saving..." : "Save profile"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function ProfileItem({ label, value }) {
  return (
    <article className="profile-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function initials(name = "?") {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
