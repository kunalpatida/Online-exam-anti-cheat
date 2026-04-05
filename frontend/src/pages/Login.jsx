import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/Toast";

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      toast("Welcome back! 👋", "success");
      navigate("/dashboard");
    } catch (err) {
      toast(err.response?.data?.error || "Invalid credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-strong anim-scale-in">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800,
            background: "var(--grad-accent2)", WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 8 }}>
            SmartExam AI
          </div>
          <h2 style={{ fontSize: "1.6rem", marginBottom: 6 }}>Welcome back</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Signing in...</> : "Sign In →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--text-muted)" }}>
          No account?{" "}
          <Link to="/register" style={{ color: "var(--purple)", textDecoration: "none" }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
