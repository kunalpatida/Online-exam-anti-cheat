import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function JoinExam() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return setError("Please enter exam code");
    setError(""); setLoading(true);
    try {
      const res = await api.post("/exam/join", { exam_code: code.trim().toUpperCase() });
      navigate(`/exam/${res.data.exam.exam_id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid exam code");
    } finally { setLoading(false); }
  };

  return (
    <div className="page-center">
      <motion.div className="container-sm" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.6rem" }}>Join Exam</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.4rem" }}>Enter your exam code to begin</p>
        </div>
        <div className="glass-strong" style={{ padding: "2.5rem" }}>
          <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {error && (
              <div style={{ background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem", color: "#fda4af", fontSize: "0.88rem" }}>
                ⚠️ {error}
              </div>
            )}
            <div>
              <label className="input-label">Exam Code</label>
              <input className="input" placeholder="e.g. AB1234" value={code}
                onChange={e => setCode(e.target.value.toUpperCase())} required
                style={{ fontFamily: "monospace", fontSize: "1.2rem", letterSpacing: "0.1em", textAlign: "center" }} />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Joining...</> : "Join Exam →"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
