import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/Toast";

export default function CreateExam() {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", duration: 30, marks: 10, startTime: "", endTime: "" });
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast("Enter exam title", "error");
    setLoading(true);
    try {
      const res = await api.post("/exam/create", {
        title: form.title,
        duration_minutes: Number(form.duration),
        total_marks: Number(form.marks),
        start_time: form.startTime || null,
        end_time: form.endTime || null,
      });
      toast(`Exam created! Code: ${res.data.exam_code}`, "success");
      navigate(`/exam-builder/${res.data.exam_code}`);
    } catch (err) {
      toast(err.response?.data?.error || "Failed to create exam", "error");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-strong anim-scale-in" style={{ maxWidth: 520 }}>
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => navigate("/dashboard")}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 0, marginBottom: 16 }}>
            ← Back to Dashboard
          </button>
          <h2 style={{ fontSize: "1.5rem", marginBottom: 4 }}>Create New Exam</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Fill in the details to get started</p>
        </div>

        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label className="input-label">Exam Title *</label>
            <input className="input" placeholder="e.g. Physics Mid-Term 2024"
              value={form.title} onChange={set("title")} required />
          </div>
          <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
            <div>
              <label className="input-label">Duration (minutes)</label>
              <input className="input" type="number" min="1"
                value={form.duration} onChange={set("duration")} />
            </div>
            <div>
              <label className="input-label">Total Marks</label>
              <input className="input" type="number" min="1"
                value={form.marks} onChange={set("marks")} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Start Time (optional)</label>
            <input className="input" type="datetime-local"
              value={form.startTime} onChange={set("startTime")} />
          </div>
          <div className="input-group" style={{ marginBottom: 24 }}>
            <label className="input-label">End Time (optional)</label>
            <input className="input" type="datetime-local"
              value={form.endTime} onChange={set("endTime")} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Creating...</> : "Create Exam & Add Questions →"}
          </button>
        </form>
      </div>
    </div>
  );
}
