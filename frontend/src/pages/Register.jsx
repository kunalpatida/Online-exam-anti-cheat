import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/Toast";

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", organization: "", password: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      toast("Account created! Please login.", "success");
      navigate("/login");
    } catch (err) {
      toast(err.response?.data?.error || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-strong anim-scale-in">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800,
            background: "var(--grad-accent2)", WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 8 }}>
            SmartExam AI
          </div>
          <h2 style={{ fontSize: "1.5rem", marginBottom: 6 }}>Create account</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Join thousands of educators</p>
        </div>

        <form onSubmit={handleRegister}>
          {[
            { key: "name",         label: "Full Name",           type: "text",     ph: "John Doe" },
            { key: "email",        label: "Email",               type: "email",    ph: "you@example.com" },
            { key: "organization", label: "College / School",    type: "text",     ph: "MIT University" },
            { key: "password",     label: "Password",            type: "password", ph: "••••••••" },
          ].map(f => (
            <div className="input-group" key={f.key}>
              <label className="input-label">{f.label}</label>
              <input className="input" type={f.type} placeholder={f.ph}
                value={form[f.key]} onChange={set(f.key)} required />
            </div>
          ))}
          <button type="submit" className="btn btn-primary btn-lg btn-full"
            style={{ marginTop: 8 }} disabled={loading}>
            {loading ? <><span className="spinner" /> Creating...</> : "Create Account →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--purple)", textDecoration: "none" }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
