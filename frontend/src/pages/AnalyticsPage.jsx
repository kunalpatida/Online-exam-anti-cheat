import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/exam/results/${id}`)
      .then(res => setData(Array.isArray(res.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const scoreData = data.map(d => ({ name: d.name?.split(" ")[0] || "?", score: Number(d.score) || 0 }));
  const passCount = data.filter(d => Number(d.score) >= Number(d.total_marks) * 0.4).length;
  const pieData = [{ name: "Pass", value: passCount }, { name: "Fail", value: data.length - passCount }];
  const avg = data.length ? (data.reduce((s, d) => s + Number(d.score), 0) / data.length).toFixed(1) : 0;

  const tooltipStyle = { background: "rgba(15,12,41,0.95)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 8, color: "#f0eeff" };

  if (loading) return (
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
      <div className="page">
        <div className="container">
          <h2 style={{ marginBottom: 24 }} className="anim-fade-up">Exam Analytics</h2>

          {/* Stats */}
          <div className="grid-4 anim-fade-up anim-delay-1" style={{ marginBottom: 28 }}>
            {[
              { label: "Students", value: data.length },
              { label: "Average Score", value: avg },
              { label: "Passed", value: passCount },
              { label: "Pass Rate", value: data.length ? `${Math.round(passCount/data.length*100)}%` : "0%" },
            ].map((s, i) => (
              <div key={i} className="glass stat-card">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid-2 anim-fade-up anim-delay-2" style={{ marginBottom: 28 }}>
            <div className="glass" style={{ padding: "24px" }}>
              <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Score Distribution</h3>
              {data.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📊</div><div>No data yet</div></div> : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreData}>
                    <XAxis dataKey="name" tick={{ fill: "rgba(240,238,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(240,238,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(167,139,250,0.1)" }} />
                    <Bar dataKey="score" fill="url(#barGrad)" radius={[4,4,0,0]} />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="glass" style={{ padding: "24px" }}>
              <h3 style={{ marginBottom: 16, fontSize: "1rem" }}>Pass vs Fail</h3>
              {data.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🥧</div><div>No data yet</div></div> : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" outerRadius={90} innerRadius={40} paddingAngle={4} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      <Cell fill="#34d399" /><Cell fill="#f87171" />
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="glass anim-fade-up anim-delay-3" style={{ overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 0" }}><h3>Detailed Results</h3></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Score</th><th>Total</th><th>%</th><th>Status</th><th>Cheats</th></tr></thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📋</div><div>No data</div></div></td></tr>
                  ) : data.map((d, i) => {
                    const pct = d.total_marks ? Math.round(Number(d.score)/Number(d.total_marks)*100) : 0;
                    return (
                      <tr key={i}>
                        <td>{d.name}</td>
                        <td>{d.score}</td>
                        <td>{d.total_marks}</td>
                        <td>{pct}%</td>
                        <td><span className={`badge ${pct >= 40 ? "badge-success" : "badge-danger"}`}>{pct >= 40 ? "Pass" : "Fail"}</span></td>
                        <td>{d.cheat_count > 0 ? <span className="badge badge-danger">⚠️ {d.cheat_count}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
