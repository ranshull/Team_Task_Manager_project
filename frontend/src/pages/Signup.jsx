import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import { useSignupSettings } from "../api/hooks/useSettings.js";
import "./Login.css";

export default function Signup() {
  const [form, setForm] = useState({ email: "", username: "", phone: "", password: "", role: "member" });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { signup, isAuthenticated } = useAuth();
  const { data: signupSettings } = useSignupSettings();
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      await signup(form);
      navigate("/dashboard");
    } catch (err) {
      const status = err.response?.status;
      setError(
        status === 409
          ? "An account with this email or username already exists."
          : err.response?.data?.detail || "Account could not be created. Please check your details."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <p>Start clean</p>
        <h1>Create a calmer place for team work.</h1>
        <span>Set up your account, join projects, and keep every task visible.</span>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card__heading">
          <p>Team Task Manager</p>
          <h1>Create account</h1>
        </div>
        <label className="field"><span>Email</span><input type="email" value={form.email} onChange={update("email")} required /></label>
        <label className="field"><span>Username</span><input value={form.username} onChange={update("username")} required minLength="3" /></label>
        <label className="field"><span>Phone</span><input value={form.phone} onChange={update("phone")} placeholder="Optional" /></label>
        {signupSettings?.allow_signup_role_selection && (
          <label className="field">
            <span>Account role</span>
            <select value={form.role} onChange={update("role")}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        )}
        <label className="field password-field">
          <span>Password</span>
          <div>
            <input type={showPassword ? "text" : "password"} value={form.password} onChange={update("password")} required minLength="8" />
            <button type="button" onClick={() => setShowPassword((current) => !current)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button button--loading" disabled={isSubmitting}>
          {isSubmitting && <span className="spinner" />}
          {isSubmitting ? "Creating..." : "Create account"}
        </button>
        <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </main>
  );
}
