import { motion } from "framer-motion";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import HlsBackgroundVideo from "../components/HlsBackgroundVideo";
import { useAuth } from "../context/AuthContext";
import "./LandingPage.css";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const result = await signup(name.trim(), email.trim(), password);
    setLoading(false);

    if (result.success) {
      navigate("/report", { replace: true });
      return;
    }

    setError(result.error || "Signup failed");
  };

  return (
    <main className="login-page">
      <div className="login-page__video">
        <HlsBackgroundVideo />
        <div className="login-page__shade" />
        <div className="login-page__fade" />
      </div>

      <Link className="login-page__home" to="/">
        <span>JS</span>
        <strong>JalanScan AI</strong>
      </Link>

      <motion.section
        className="login-shell"
        initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="login-shell__intro">
          <p className="section-eyebrow">
            <span />
            Citizen Portal
          </p>
          <h1>
            Create your <em>account</em>
          </h1>
          <p>
            Sign up to report road damage in your area. Your submissions go
            directly to city maintenance authorities in real time.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__header">
            <span className="login-form__mark">
              <i className="fa-solid fa-road" />
            </span>
            <div>
              <h2>Get started</h2>
              <p>Create a free citizen account.</p>
            </div>
          </div>

          {/* Name */}
          <label className="login-field">
            <span>Full name</span>
            <span className="login-field__control">
              <i className="fa-solid fa-user" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your full name"
                autoComplete="name"
              />
            </span>
          </label>

          {/* Email */}
          <label className="login-field">
            <span>Email address</span>
            <span className="login-field__control">
              <i className="fa-solid fa-envelope" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </span>
          </label>

          {/* Password */}
          <label className="login-field">
            <span>Password</span>
            <span className="login-field__control">
              <i className="fa-solid fa-lock" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="login-field__toggle"
                onClick={() => setShowPassword((c) => !c)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i
                  className={`fa-solid ${
                    showPassword ? "fa-eye-slash" : "fa-eye"
                  }`}
                />
              </button>
            </span>
          </label>

          {/* Confirm password */}
          <label className="login-field">
            <span>Confirm password</span>
            <span className="login-field__control">
              <i className="fa-solid fa-lock" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
            </span>
          </label>

          {error && (
            <motion.div
              className="login-error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <i className="fa-solid fa-circle-exclamation" />
              <p>{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            <span>
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Creating account…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-user-plus" />
                  Create account
                </>
              )}
            </span>
          </button>

          <div className="login-form__footer">
            <Link to="/login">Already have an account? Sign in</Link>
          </div>
        </form>
      </motion.section>
    </main>
  );
}
