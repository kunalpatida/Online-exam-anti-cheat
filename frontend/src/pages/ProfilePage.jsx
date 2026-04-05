import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function ProfilePage() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/exam/profile").then(res => setData(res.data)).catch(() => navigate("/login"));
  }, []);

  const logout = () => { localStorage.removeItem("token"); navigate("/"); };

  if (!data) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, position: "relative" }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <nav className="navbar">
        <span className="nav-logo">SmartExam AI</span>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/dashboard")}>← Dashboard</button>
      </nav>
      <div className="auth-page">
        <div className="auth-card glass-strong anim-scale-in" style={{ textAlign: "center" }}>
          <div className="avatar avatar-lg" style={{ margin: "0 auto 16px" }}>
            {data.user.name?.charAt(0).toUpperCase()}
          </div>
          <h2 style={{ marginBottom: 4 }}>{data.user.name}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 28 }}>{data.user.email}</p>

          <div className="grid-2" style={{ marginBottom: 28 }}>
            <div className="glass stat-card">
              <div className="stat-value">{data.created}</div>
              <div className="stat-label">Exams Created</div>
            </div>
            <div className="glass stat-card">
              <div className="stat-value">{data.attempted}</div>
              <div className="stat-label">Exams Taken</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn btn-secondary btn-full" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
            <button className="btn btn-danger btn-full" onClick={logout}>Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
