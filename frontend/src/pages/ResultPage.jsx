import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/Toast";

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [results, setResults] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [marks, setMarks] = useState({});
  const [evaluated, setEvaluated] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/exam/results/${id}`),
      api.get(`/exam/answers/${id}`)
    ]).then(([r, a]) => {
      setResults(Array.isArray(r.data) ? r.data : []);
      setAnswers(Array.isArray(a.data) ? a.data : []);
    }).catch(() => toast("Failed to load results", "error"))
    .finally(() => setLoading(false));
  }, [id]);

  const maxPerQ = results.length > 0
    ? results[0].total_marks / Math.max(answers.length + (results[0]?.mcq_count || 1), 1)
    : 0;

  const submitEval = async (a, isEdit = false) => {
    const val = marks[a.question_id];
    if (!val && val !== 0) return;
    try {
      await api.post("/exam/evaluate", {
        user_id: a.user_id, exam_id: id, question_id: a.question_id, marks: val
      });
      setEvaluated(p => ({ ...p, [a.question_id]: !isEdit, [`edit_${a.question_id}`]: false }));
      toast("Marks saved!", "success");
    } catch (err) {
      toast(err.response?.data?.error || "Failed to save", "error");
    }
  };

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
          <h2 style={{ marginBottom: 24 }} className="anim-fade-up">Exam Results</h2>

          {/* Results list */}
          <div style={{ marginBottom: 32 }}>
            {results.length === 0 ? (
              <div className="glass"><div className="empty-state"><div className="empty-state-icon">📊</div><div>No submissions yet</div></div></div>
            ) : results.map((r, i) => {
              const pct = r.total_marks ? Math.round((r.score / r.total_marks) * 100) : 0;
              const pass = pct >= 40;
              return (
                <div key={i} className="glass anim-fade-up" style={{ padding: "20px 24px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{r.email}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--purple)" }}>
                      {r.score} <span style={{ fontSize: 14, opacity: 0.5 }}>/ {r.total_marks}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{pct}%</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className={`badge ${pass ? "badge-success" : "badge-danger"}`}>{pass ? "Pass" : "Fail"}</span>
                    {r.evaluation_status === "PENDING" && <span className="badge badge-warning">Pending Eval</span>}
                    {r.cheat_count > 0 && <span className="badge badge-danger">⚠️ {r.cheat_count} cheats</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Descriptive evaluation */}
          {answers.length > 0 && (
            <div className="glass" style={{ padding: "24px" }}>
              <h3 style={{ marginBottom: 20 }}>Descriptive Evaluation</h3>
              {answers.map((a, i) => {
                const val = marks[a.question_id] ?? "";
                const maxQ = results.length > 0 ? results[0].total_marks / Math.max(
                  (answers.length + (results[0]?.mcq_count || 0)), 1) : 10;
                const invalid = Number(val) > maxQ;
                const done = evaluated[a.question_id];
                const editing = evaluated[`edit_${a.question_id}`];
                return (
                  <div key={i} style={{ borderBottom: "1px solid var(--glass-border)", paddingBottom: 20, marginBottom: 20 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{a.question_text}</div>
                    <div className="glass" style={{ padding: "12px 16px", marginBottom: 12, fontSize: 14, lineHeight: 1.6, background: "rgba(255,255,255,0.03)" }}>
                      {a.text_answer || <em style={{ color: "var(--text-muted)" }}>No answer provided</em>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input type="number" className="input" min="0" placeholder={`Max ${maxQ.toFixed(1)}`}
                        style={{ width: 100, borderColor: invalid ? "var(--danger)" : undefined }}
                        value={val} disabled={done && !editing}
                        onChange={e => setMarks(p => ({ ...p, [a.question_id]: Number(e.target.value) }))} />
                      {invalid && <span style={{ fontSize: 12, color: "var(--danger)" }}>Max {maxQ.toFixed(1)}</span>}
                      {!done && (
                        <button className="btn btn-primary btn-sm" disabled={!val && val !== 0 || invalid}
                          onClick={() => submitEval(a)}>Save Marks</button>
                      )}
                      {done && !editing && (
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => setEvaluated(p => ({ ...p, [`edit_${a.question_id}`]: true }))}>
                          Edit
                        </button>
                      )}
                      {editing && (
                        <button className="btn btn-success btn-sm" disabled={!val && val !== 0 || invalid}
                          onClick={() => submitEval(a, true)}>Update</button>
                      )}
                      {done && !editing && <span className="badge badge-success">✓ Saved</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
