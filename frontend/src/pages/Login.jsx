import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import "./Login.css";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login(identifier, password);
      navigate("/dashboard");
    } catch (err) {
      const status = err.response?.status;
      setError(
        status === 401
          ? "Email, username, or password is incorrect."
          : err.response?.data?.detail || "Unable to sign in. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <p>Welcome back</p>
        <h1>Bring every task back into focus.</h1>
        <span>Track progress, move work forward, and keep the team aligned.</span>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card__heading">
          <p>Team Task Manager</p>
          <h1>Sign in</h1>
        </div>
        <label className="field">
          <span>Email or username</span>
          <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
        </label>
        <label className="field password-field">
          <span>Password</span>
          <div>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button type="button" onClick={() => setShowPassword((current) => !current)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button button--loading" disabled={isSubmitting}>
          {isSubmitting && <span className="spinner" />}
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        <p className="muted">Need an account? <Link to="/signup">Create one</Link></p>
      </form>
    </main>
  );
}
