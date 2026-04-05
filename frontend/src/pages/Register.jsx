import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", organization: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Try again.");
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
            Create account
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.35rem", fontSize: "0.9rem" }}>
            Join SmartExam AI today
          </p>
        </div>

        <div className="glass-strong" style={{ padding: "2.25rem" }}>
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

            {error && (
              <div style={{
                background: "#fee2e2", border: "1px solid #fca5a5",
                borderRadius: "var(--radius-sm)", padding: "0.7rem 1rem",
                color: "#b91c1c", fontSize: "0.85rem", fontWeight: 500,
              }}>
                ⚠️ {error}
              </div>
            )}

            {[
              { key: "name",         label: "Full Name",              type: "text",     placeholder: "John Doe" },
              { key: "email",        label: "Email",                  type: "email",    placeholder: "you@example.com" },
              { key: "organization", label: "College / Organization", type: "text",     placeholder: "MIT University" },
              { key: "password",     label: "Password",               type: "password", placeholder: "••••••••" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="input-label">{label}</label>
                <input className="input" type={type} placeholder={placeholder}
                  value={form[key]} onChange={set(key)} required />
              </div>
            ))}

            <button type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={loading} style={{ marginTop: "0.4rem" }}>
              {loading ? <><span className="spinner" /> Creating account...</> : "Create Account →"}
            </button>
          </form>

          <hr className="divider" />

          <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.86rem" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#3b7ef8", textDecoration: "none", fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
