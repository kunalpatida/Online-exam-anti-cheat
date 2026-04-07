import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

// Storage key for exam draft so data survives accidental refresh
const EXAM_DRAFT_KEY = "new_exam_draft";

export default function CreateExam() {
  const navigate = useNavigate();

  // Try to restore a draft from localStorage if user refreshed the page
  const savedDraft = (() => {
    try { return JSON.parse(localStorage.getItem(EXAM_DRAFT_KEY)) || {}; }
    catch { return {}; }
  })();

  const [title, setTitle]         = useState(savedDraft.title || "");
  const [duration, setDuration]   = useState(savedDraft.duration || 30);
  const [marks, setMarks]         = useState(savedDraft.marks || 10);
  const [startTime, setStartTime] = useState(savedDraft.startTime || "");
  const [endTime, setEndTime]     = useState(savedDraft.endTime || "");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Auto-save form values to localStorage so refresh does not lose data
  const saveFieldToStorage = (field, value) => {
    try {
      const current = JSON.parse(localStorage.getItem(EXAM_DRAFT_KEY)) || {};
      localStorage.setItem(EXAM_DRAFT_KEY, JSON.stringify({ ...current, [field]: value }));
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Exam title is required");

    setError("");
    setLoading(true);

    try {
      // Create the exam shell in the database
      const res = await api.post("/exam/create", {
        title: title.trim(),
        duration_minutes: Number(duration),
        total_marks: Number(marks),
        start_time: startTime || null,
        end_time: endTime || null,
      });

      // Clear the draft now that exam is created
      localStorage.removeItem(EXAM_DRAFT_KEY);

      // Navigate to question builder with the exam code
      navigate(`/exam-builder/${res.data.exam_code}`);

    } catch (err) {
      setError(err.response?.data?.error || "Failed to create exam. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <motion.div className="wrap-sm" style={{ width: "100%" }}
        initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}>

        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <h1 style={{ fontWeight: 800, fontSize: "1.6rem", letterSpacing: "-0.03em", color: "#0f172a" }}>
            Create Exam
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.3rem", fontSize: "0.88rem" }}>
            Set up your exam details. You will add questions on the next screen.
          </p>
        </div>

        <div className="glass-strong" style={{ padding: "2rem 2.25rem" }}>
          {error && (
            <div className="err-box" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <div>
              <label className="input-label">Exam Title</label>
              <input className="input" type="text" placeholder="e.g. Physics Chapter 5 Test"
                value={title} required
                onChange={e => { setTitle(e.target.value); saveFieldToStorage("title", e.target.value); }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label className="input-label">Duration (minutes)</label>
                <input className="input" type="number" min="1" value={duration}
                  onChange={e => { setDuration(e.target.value); saveFieldToStorage("duration", e.target.value); }}
                />
              </div>
              <div>
                <label className="input-label">Total Marks</label>
                <input className="input" type="number" min="1" value={marks}
                  onChange={e => { setMarks(e.target.value); saveFieldToStorage("marks", e.target.value); }}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Start Time (optional)</label>
              <input className="input" type="datetime-local" value={startTime}
                onChange={e => { setStartTime(e.target.value); saveFieldToStorage("startTime", e.target.value); }}
              />
            </div>

            <div>
              <label className="input-label">End Time (optional)</label>
              <input className="input" type="datetime-local" value={endTime}
                onChange={e => { setEndTime(e.target.value); saveFieldToStorage("endTime", e.target.value); }}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={loading} style={{ marginTop: "0.25rem" }}>
              {loading ? <><span className="spin" /> Creating...</> : "Continue to Add Questions"}
            </button>

          </form>
        </div>
      </motion.div>
    </div>
  );
}
