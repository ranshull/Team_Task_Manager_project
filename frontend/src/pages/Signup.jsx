import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../api/hooks/useAuth.js";
import "./Login.css";

export default function Signup() {
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const { signup, isAuthenticated } = useAuth();
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
    try {
      await signup(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to create account");
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create account</h1>
        <label className="field"><span>Email</span><input type="email" value={form.email} onChange={update("email")} required /></label>
        <label className="field"><span>Username</span><input value={form.username} onChange={update("username")} required minLength="3" /></label>
        <label className="field"><span>Password</span><input type="password" value={form.password} onChange={update("password")} required minLength="8" /></label>
        {error && <p className="error">{error}</p>}
        <button className="button">Create account</button>
        <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </main>
  );
}
