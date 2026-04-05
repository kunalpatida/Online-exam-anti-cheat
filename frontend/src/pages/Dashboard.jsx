import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/Toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [examCode, setExamCode] = useState("");
  const [exams, setExams] = useState([]);
  const [user, setUser] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [profile, examList] = await Promise.all([
          api.get("/exam/profile"),
          api.get("/exam/list"),
        ]);
        setUser(profile.data.user);
        setExams(Array.isArray(examList.data) ? examList.data : []);
      } catch { toast("Failed to load data", "error"); }
    })();
  }, []);

  const handleJoin = async () => {
    if (!examCode.trim()) return toast("Enter exam code", "error");
    setJoining(true);
    try {
      const res = await api.post("/exam/join", { exam_code: examCode.trim().toUpperCase() });
      navigate(`/exam/${res.data.exam.exam_id}`);
    } catch (err) {
      toast(err.response?.data?.error || "Invalid or expired exam code", "error");
    } finally { setJoining(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast(`Copied: ${code}`, "info");
  };

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <nav className="navbar">
        <span className="nav-logo">SmartExam AI</span>
        <div className="flex-gap">
          <Link to="/profile">
            <div className="avatar" title="Profile">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </Link>
        </div>
      </nav>

      <div className="page">
        <div className="container">
          {/* Header */}
          <div className="anim-fade-up" style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: "1.8rem", marginBottom: 4 }}>
              Welcome, <span className="gradient-text">{user?.name || "there"}</span> 👋
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Manage your exams and track student progress</p>
          </div>

          {/* Action cards */}
          <div className="grid-2 anim-fade-up anim-delay-1" style={{ marginBottom: 32 }}>
            {/* Join */}
            <div className="glass" style={{ padding: "28px 24px" }}>
              <h3 style={{ marginBottom: 6 }}>🎯 Join Exam</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>Enter code to start an exam</p>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="input" placeholder="Exam code..."
                  value={examCode} onChange={e => setExamCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleJoin()}
                  style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={handleJoin} disabled={joining}>
                  {joining ? <span className="spinner" /> : "Join"}
                </button>
              </div>
            </div>

            {/* Create */}
            <div className="glass" style={{ padding: "28px 24px" }}>
              <h3 style={{ marginBottom: 6 }}>✨ Create Exam</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
                Build a new exam with AI assistance
              </p>
              <button className="btn btn-success btn-full" onClick={() => navigate("/create-exam")}>
                + Create New Exam
              </button>
            </div>
          </div>

          {/* Exams table */}
          <div className="glass anim-fade-up anim-delay-2" style={{ overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 0", marginBottom: 4 }}>
              <h3>My Exams</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th className="hide-mobile">Duration</th>
                    <th className="hide-mobile">Marks</th>
                    <th>Code</th>
                    <th>Attempts</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.length === 0 ? (
                    <tr><td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <div>No exams created yet</div>
                      </div>
                    </td></tr>
                  ) : exams.map(exam => (
                    <tr key={exam.exam_id}>
                      <td>{exam.title}</td>
                      <td className="hide-mobile">{exam.duration_minutes} min</td>
                      <td className="hide-mobile">{exam.total_marks}</td>
                      <td>
                        <span style={{ fontFamily: "monospace", color: "var(--purple)", fontSize: 13 }}>
                          {exam.exam_code}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-blue">{exam.attempts || 0}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => copyCode(exam.exam_code)}>Copy</button>
                          <Link to={`/results/${exam.exam_id}`}
                            className="btn btn-success btn-sm">Results</Link>
                          <Link to={`/analytics/${exam.exam_id}`}
                            className="btn btn-sm" style={{ background: "rgba(167,139,250,0.2)", color: "var(--purple)", border: "1px solid rgba(167,139,250,0.3)" }}>
                            Analytics
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
