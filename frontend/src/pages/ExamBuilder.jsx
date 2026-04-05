import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/Toast";

const DRAFT_KEY = (code) => `exam_draft_${code}`;

const emptyQ = () => ({
  question_text: "", question_type: "MCQ",
  option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "A"
});

export default function ExamBuilder() {
  const { code } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [examId, setExamId] = useState(null);
  const [questions, setQuestions] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY(code));
      return saved ? JSON.parse(saved) : [emptyQ()];
    } catch { return [emptyQ()]; }
  });
  const [showPreview, setShowPreview] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [currentIndex, setCurrentIndex] = useState(null);
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(null);

  // Auto-save draft to localStorage
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY(code), JSON.stringify(questions));
  }, [questions, code]);

  useEffect(() => {
    api.post("/exam/join", { exam_code: code })
      .then(res => setExamId(res.data.exam.exam_id))
      .catch(() => toast("Invalid exam code", "error"));
  }, [code]);

  const setQ = (i, k, v) => {
    setQuestions(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [k]: v };
      return updated;
    });
  };

  const addQuestion = () => setQuestions(p => [...p, emptyQ()]);
  const removeQuestion = (i) => setQuestions(p => p.filter((_, idx) => idx !== i));

  const generateOptions = async (i) => {
    const q = questions[i];
    if (!q.question_text || !q.option_a) return toast("Enter question and correct answer first", "error");
    setOptionsLoading(i);
    try {
      const res = await api.post("/exam/ai-generate-options", {
        question: q.question_text, correct_answer: q.option_a
      });
      const w = res.data.wrong_options;
      setQ(i, "option_b", w[0] || "");
      setQ(i, "option_c", w[1] || "");
      setQ(i, "option_d", w[2] || "");
      toast("AI options generated!", "success");
    } catch { toast("AI options failed", "error"); }
    finally { setOptionsLoading(null); }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return toast("Enter a topic", "error");
    if (modalType === "exam" && !subject.trim()) return toast("Enter subject", "error");
    setGenerating(true);
    try {
      if (modalType === "question") {
        const res = await api.post("/exam/ai-generate-question", { topic });
        const d = res.data;
        const updated = [...questions];
        updated[currentIndex] = {
          ...updated[currentIndex],
          question_text: d.question,
          option_a: d.options[0]?.replace(/^A:\s*/, "") || "",
          option_b: d.options[1]?.replace(/^B:\s*/, "") || "",
          option_c: d.options[2]?.replace(/^C:\s*/, "") || "",
          option_d: d.options[3]?.replace(/^D:\s*/, "") || "",
          correct_option: d.correct || "A",
        };
        setQuestions(updated);
        toast("Question generated!", "success");
      } else {
        const res = await api.post("/exam/ai-generate-full-exam", { subject, topic, difficulty, count: Number(count) });
        const gen = res.data.questions;
        if (!gen?.length) return toast("No questions generated", "error");
        setQuestions(gen.map(q => ({
          question_text: q.question_text, question_type: "MCQ",
          option_a: q.options[0]?.replace(/^A:\s*/, "") || "",
          option_b: q.options[1]?.replace(/^B:\s*/, "") || "",
          option_c: q.options[2]?.replace(/^C:\s*/, "") || "",
          option_d: q.options[3]?.replace(/^D:\s*/, "") || "",
          correct_option: q.correct || "A",
        })));
        setShowPreview(true);
        toast(`${gen.length} questions generated!`, "success");
      }
      setShowModal(false);
    } catch (err) {
      toast(err.response?.data?.error || "Generation failed. Try again.", "error");
    } finally { setGenerating(false); }
  };

  const handleSaveAll = async () => {
    if (!examId) return toast("Exam not loaded", "error");
    const empty = questions.filter(q => !q.question_text.trim());
    if (empty.length) return toast(`${empty.length} questions are empty`, "error");
    setSavingAll(true);
    try {
      for (const q of questions) {
        await api.post("/exam/add-question", {
          exam_id: examId,
          question_text: q.question_text,
          question_type: q.question_type,
          option_a: q.option_a, option_b: q.option_b,
          option_c: q.option_c, option_d: q.option_d,
          correct_option: q.correct_option,
        });
      }
      localStorage.removeItem(DRAFT_KEY(code));
      toast(`${questions.length} questions saved!`, "success");
      setQuestions([emptyQ()]);
    } catch { toast("Failed to save questions", "error"); }
    finally { setSavingAll(false); }
  };

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      <nav className="navbar">
        <span className="nav-logo">SmartExam AI</span>
        <div className="flex-gap">
          <span className="badge badge-purple">Code: {code}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate("/dashboard")}>Dashboard</button>
        </div>
      </nav>

      <div className="page">
        <div className="container-md">
          {/* Header */}
          <div className="flex-between anim-fade-up" style={{ marginBottom: 24 }}>
            <div>
              <h2>Exam Builder</h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2 }}>
                {questions.length} question{questions.length !== 1 ? "s" : ""} — auto-saved
              </p>
            </div>
            <div className="flex-gap">
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setModalType("exam"); setTopic(""); setSubject(""); setShowModal(true);
              }}>✨ AI Full Exam</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPreview(p => !p)}>
                {showPreview ? "Hide" : "Preview"}
              </button>
            </div>
          </div>

          {/* Questions */}
          {questions.map((q, i) => (
            <div key={i} className="glass anim-fade-up" style={{ padding: "20px", marginBottom: 16 }}>
              <div className="flex-between" style={{ marginBottom: 12 }}>
                <span className="badge badge-purple">Q{i + 1}</span>
                <div className="flex-gap">
                  <select className="input" style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}
                    value={q.question_type} onChange={e => setQ(i, "question_type", e.target.value)}>
                    <option value="MCQ">MCQ</option>
                    <option value="DESCRIPTIVE">Descriptive</option>
                  </select>
                  {questions.length > 1 && (
                    <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(i)}>✕</button>
                  )}
                </div>
              </div>

              <textarea className="input" rows={2} placeholder="Enter question..."
                value={q.question_text} onChange={e => setQ(i, "question_text", e.target.value)}
                style={{ marginBottom: 12 }} />

              {q.question_type === "MCQ" && (
                <>
                  <input className="input" placeholder="✅ Correct Answer (Option A)"
                    value={q.option_a} onChange={e => setQ(i, "option_a", e.target.value)}
                    style={{ marginBottom: 10, borderColor: "rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.05)" }} />
                  <div className="flex-gap" style={{ marginBottom: 10 }}>
                    <button className="btn btn-sm" style={{ background: "rgba(99,102,241,0.2)", color: "var(--indigo)", border: "1px solid rgba(99,102,241,0.3)" }}
                      onClick={() => { setModalType("question"); setCurrentIndex(i); setTopic(""); setShowModal(true); }}>
                      🤖 AI Question
                    </button>
                    <button className="btn btn-sm" style={{ background: "rgba(167,139,250,0.15)", color: "var(--purple)", border: "1px solid rgba(167,139,250,0.25)" }}
                      onClick={() => generateOptions(i)} disabled={optionsLoading === i}>
                      {optionsLoading === i ? <><span className="spinner" /> Generating...</> : "✨ AI Options"}
                    </button>
                  </div>
                  {["b", "c", "d"].map(opt => (
                    <input key={opt} className="input" placeholder={`Option ${opt.toUpperCase()}`}
                      value={q[`option_${opt}`]} onChange={e => setQ(i, `option_${opt}`, e.target.value)}
                      style={{ marginBottom: 8 }} />
                  ))}
                </>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex-gap anim-fade-up" style={{ marginTop: 8, marginBottom: 24 }}>
            <button className="btn btn-secondary" onClick={addQuestion}>+ Add Question</button>
            <button className="btn btn-success" onClick={handleSaveAll} disabled={savingAll}>
              {savingAll ? <><span className="spinner" /> Saving...</> : "💾 Save All Questions"}
            </button>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="glass" style={{ padding: "24px", marginBottom: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Preview</h3>
              {questions.map((q, i) => (
                <div key={i} style={{ borderBottom: "1px solid var(--glass-border)", paddingBottom: 16, marginBottom: 16 }}>
                  <p style={{ fontWeight: 500, marginBottom: 8 }}>{i + 1}. {q.question_text}</p>
                  {q.question_type === "MCQ" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {["a", "b", "c", "d"].map(opt => q[`option_${opt}`] && (
                        <span key={opt} style={{
                          padding: "6px 10px", borderRadius: 6, fontSize: 13,
                          background: opt === "a" ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${opt === "a" ? "rgba(52,211,153,0.3)" : "var(--glass-border)"}`,
                          color: opt === "a" ? "var(--success)" : "var(--text-secondary)"
                        }}>
                          {opt.toUpperCase()}. {q[`option_${opt}`]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !generating) setShowModal(false); }}>
          <div className="glass-strong modal">
            <h3 className="modal-title">
              {modalType === "question" ? "🤖 Generate Question" : "✨ Generate Full Exam"}
            </h3>
            <div className="input-group">
              <label className="input-label">Topic *</label>
              <input className="input" placeholder="e.g. Newton's Laws of Motion"
                value={topic} onChange={e => setTopic(e.target.value)} />
            </div>
            {modalType === "exam" && (
              <>
                <div className="input-group">
                  <label className="input-label">Subject *</label>
                  <input className="input" placeholder="e.g. Physics"
                    value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="input-group">
                    <label className="input-label">Difficulty</label>
                    <select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">No. of Questions</label>
                    <input className="input" type="number" min="1" max="20"
                      value={count} onChange={e => setCount(e.target.value)} />
                  </div>
                </div>
              </>
            )}
            {generating && (
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginBottom: 8 }}>
                ⏳ AI is working... may take 10–20 seconds
              </p>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={generating}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}
                style={{ minWidth: 120 }}>
                {generating ? <><span className="spinner" /> Generating...</> : "✨ Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
