import { useNavigate } from "react-router-dom";

export default function ExamSubmitted() {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <div className="auth-card glass-strong anim-scale-in" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ marginBottom: 8 }}>Exam Submitted!</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 28 }}>Your answers have been recorded successfully.</p>
        <button className="btn btn-primary btn-full" onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
      </div>
    </div>
  );
}
