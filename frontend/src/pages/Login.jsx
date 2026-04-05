import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <motion.div className="container-sm"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>

        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg,#3b7ef8,#60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 1rem",
            boxShadow: "0 6px 20px rgba(59,126,248,0.3)",
          }}>🎓</div>
          <h1 style={{ fontWeight: 800, fontSize: "1.65rem", letterSpacing: "-0.03em", color: "#0f172a" }}>
            Welcome back
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.35rem", fontSize: "0.9rem" }}>
            Sign in to SmartExam AI
          </p>
        </div>

        <div className="glass-strong" style={{ padding: "2.25rem" }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

            {error && (
              <div style={{
                background: "#fee2e2", border: "1px solid #fca5a5",
                borderRadius: "var(--radius-sm)", padding: "0.7rem 1rem",
                color: "#b91c1c", fontSize: "0.85rem", fontWeight: 500,
              }}>
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="input-label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="input-label">Password</label>
              <input className="input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={loading} style={{ marginTop: "0.4rem" }}>
              {loading ? <><span className="spinner" /> Signing in...</> : "Sign In →"}
            </button>
          </form>

          <hr className="divider" />

          <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.86rem" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#3b7ef8", textDecoration: "none", fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
