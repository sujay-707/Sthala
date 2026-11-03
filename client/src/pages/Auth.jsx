import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Auth({ mode }) {
  const { login, register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      mode === "login"
        ? await login({
            email: form.email,
            password: form.password,
          })
        : await register(form);

      nav("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">WELCOME TO STHALA</span>

        <h1>
          {mode === "login"
            ? "Welcome back"
            : "Create your account"}
        </h1>

        <p>
          {mode === "login"
            ? "Sign in to save stays and manage trips."
            : "Your next great stay is a few clicks away."}
        </p>

        {mode === "register" && (
          <input
            required
            placeholder="Your name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />
        )}

        <input
          required
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(e) =>
            setForm({ ...form, email: e.target.value })
          }
        />

        <input
          required
          minLength="8"
          type="password"
          placeholder="Password (8+ characters)"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        {error && <p className="error">{error}</p>}

        <button className="hero-cta" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>

        <p className="auth-switch">
          {mode === "login"
            ? "New to Sthala? "
            : "Already have an account? "}

          <Link to={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? "Sign up" : "Log in"}
          </Link>
        </p>
      </form>
    </main>
  );
}