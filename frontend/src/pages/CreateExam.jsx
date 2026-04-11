import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";

// Draft key so accidental refresh does not lose work
const DRAFT_KEY = "create_exam_draft";

const emptyQuestion = () => ({
  question_text:  "",
  question_type:  "MCQ",
  option_a:       "",
  option_b:       "",
  option_c:       "",
  option_d:       "",
  correct_option: "A",
});

// Restore draft from localStorage
const loadDraft = () => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; }
  catch { return {}; }
};

export default function CreateExam() {
  const navigate = useNavigate();
  const draft    = loadDraft();

  // Exam details
  const [title,     setTitle]     = useState(draft.title     || "");
  const [duration,  setDuration]  = useState(draft.duration  || 30);
  const [marks,     setMarks]     = useState(draft.marks     || 10);
  const [startTime, setStartTime] = useState(draft.startTime || "");
  const [endTime,   setEndTime]   = useState(draft.endTime   || "");

  // Questions
  const [questions, setQuestions] = useState(
    draft.questions && draft.questions.length > 0 ? draft.questions : [emptyQuestion()]
  );

  // UI states
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [toast,         setToast]         = useState(null);
  const [optLoadingIdx, setOptLoadingIdx] = useState(null);
  const [modal,         setModal]         = useState(false);
  const [modalType,     setModalType]     = useState("");
  const [curIdx,        setCurIdx]        = useState(null);
  const [topic,         setTopic]         = useState("");
  const [subject,       setSubject]       = useState("");
  const [difficulty,    setDifficulty]    = useState("easy");
  const [aiCount,       setAiCount]       = useState(5);
  const [generating,    setGenerating]    = useState(false);

  const showToast = (msg, type = "s") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Save entire form to localStorage on every change
  const saveDraft = (update = {}) => {
    try {
      const current = loadDraft();
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        ...current, title, duration, marks, startTime, endTime, questions, ...update
      }));
    } catch {}
  };

  const changeDetail = (setter, field) => (e) => {
    setter(e.target.value);
    saveDraft({ [field]: e.target.value });
  };

  const changeField = useCallback((index, field, value) => {
    setQuestions(qs => {
      const updated = [...qs];
      updated[index] = { ...updated[index], [field]: value };
      saveDraft({ questions: updated });
      return updated;
    });
  }, [title, duration, marks, startTime, endTime]);

  const addQuestion    = () => {
    const updated = [...questions, emptyQuestion()];
    setQuestions(updated);
    saveDraft({ questions: updated });
  };

  const removeQuestion = (index) => {
    if (questions.length === 1) return showToast("At least one question is required", "e");
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    saveDraft({ questions: updated });
  };

  // Save everything in one API call
  const handleSave = async () => {
    if (!title.trim()) return setError("Exam title is required");
    if (questions.length === 0) return setError("Add at least one question");

    const emptyOnes = questions.filter(q => !q.question_text.trim());
    if (emptyOnes.length > 0) return setError(`${emptyOnes.length} question(s) have empty text`);

    setError("");
    setSaving(true);

    try {
      const res = await api.post("/exam/create-with-questions", {
        title:            title.trim(),
        duration_minutes: Number(duration),
        total_marks:      Number(marks),
        start_time:       startTime || null,
        end_time:         endTime   || null,
        questions,
      });

      // Clear draft on success
      localStorage.removeItem(DRAFT_KEY);
      showToast("Exam created successfully");

      // Navigate to dashboard after short delay
      setTimeout(() => navigate("/dashboard"), 1200);

    } catch (err) {
      setError(err.response?.data?.error || "Failed to create exam");
    } finally {
      setSaving(false);
    }
  };

  // AI generate options for a question
  const generateOptions = async (index) => {
    const q = questions[index];
    if (!q.question_text || !q.option_a) {
      return showToast("Enter question text and correct answer first", "e");
    }
    setOptLoadingIdx(index);
    try {
      const res   = await api.post("/exam/ai-generate-options", {
        question:       q.question_text,
        correct_answer: q.option_a,
      });
      const wrong = res.data.wrong_options;
      changeField(index, "option_b", wrong[0] || "");
      changeField(index, "option_c", wrong[1] || "");
      changeField(index, "option_d", wrong[2] || "");
      showToast("AI options generated");
    } catch {
      showToast("AI option generation failed", "e");
    } finally {
      setOptLoadingIdx(null);
    }
  };

  const openQModal = (index) => { setModalType("question"); setCurIdx(index); setTopic(""); setModal(true); };
  const openEModal = ()      => { setModalType("exam");     setTopic(""); setSubject(""); setModal(true); };

  const runGenerate = async () => {
    if (!topic.trim()) return showToast("Enter a topic", "e");
    if (modalType === "exam" && !subject.trim()) return showToast("Enter a subject", "e");
    setGenerating(true);
    try {
      if (modalType === "question") {
        const res  = await api.post("/exam/ai-generate-question", { topic });
        const data = res.data;
        setQuestions(qs => {
          const updated = [...qs];
          updated[curIdx] = {
            ...updated[curIdx],
            question_text:  data.question,
            option_a:       data.options[0]?.replace(/^A:\s*/i, "").trim() || "",
            option_b:       data.options[1]?.replace(/^B:\s*/i, "").trim() || "",
            option_c:       data.options[2]?.replace(/^C:\s*/i, "").trim() || "",
            option_d:       data.options[3]?.replace(/^D:\s*/i, "").trim() || "",
            correct_option: data.correct || "A",
          };
          saveDraft({ questions: updated });
          return updated;
        });
        showToast("Question generated");
      } else {
        const res       = await api.post("/exam/ai-generate-full-exam", {
          subject, topic, difficulty, count: Number(aiCount),
        });
        const generated = res.data.questions;
        if (!generated || generated.length === 0) return showToast("No questions returned", "e");
        const formatted = generated.map(q => ({
          question_text:  q.question_text,
          question_type:  "MCQ",
          option_a:       q.options[0]?.replace(/^A:\s*/i, "").trim() || "",
          option_b:       q.options[1]?.replace(/^B:\s*/i, "").trim() || "",
          option_c:       q.options[2]?.replace(/^C:\s*/i, "").trim() || "",
          option_d:       q.options[3]?.replace(/^D:\s*/i, "").trim() || "",
          correct_option: q.correct || "A",
        }));
        setQuestions(formatted);
        saveDraft({ questions: formatted });
        showToast(`${formatted.length} questions generated`);
      }
      setModal(false);
    } catch (err) {
      showToast(err.response?.data?.error || "Generation failed. Retry.", "e");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page">
      <div className="toast-wrap">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      </div>

      <div className="wrap-md" style={{ width: "100%" }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em", color: "#0f172a" }}>
              Create Exam
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.83rem", marginTop: "0.2rem" }}>
              Fill exam details and add questions, then save everything at once
            </p>
          </div>
          <button className="btn btn-sm" onClick={openEModal}
            style={{ background: "#dbeafe", color: "#2563eb", border: "1px solid #bfdbfe" }}>
            AI Full Exam
          </button>
        </motion.div>

        {error && <div className="err-box" style={{ marginBottom: "1rem" }}>{error}</div>}

        {/* Exam Details Card */}
        <div className="glass" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <h2 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "1rem", color: "#0f172a" }}>
            Exam Details
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div>
              <label className="input-label">Exam Title</label>
              <input className="input" type="text" placeholder="e.g. Physics Chapter 5 Test"
                value={title} onChange={changeDetail(setTitle, "title")} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label className="input-label">Duration (minutes)</label>
                <input className="input" type="number" min="1" value={duration}
                  onChange={changeDetail(setDuration, "duration")} />
              </div>
              <div>
                <label className="input-label">Total Marks</label>
                <input className="input" type="number" min="1" value={marks}
                  onChange={changeDetail(setMarks, "marks")} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label className="input-label">Start Time (optional)</label>
                <input className="input" type="datetime-local" value={startTime}
                  onChange={changeDetail(setStartTime, "startTime")} />
              </div>
              <div>
                <label className="input-label">End Time (optional)</label>
                <input className="input" type="datetime-local" value={endTime}
                  onChange={changeDetail(setEndTime, "endTime")} />
              </div>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
            Questions ({questions.length})
          </h2>
        </div>

        <AnimatePresence>
          {questions.map((q, i) => (
            <motion.div key={i} className="glass" style={{ padding: "1.4rem", marginBottom: "1rem" }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
                <span className="badge badge-blue">Q{i + 1}</span>
                {questions.length > 1 && (
                  <button className="btn btn-sm"
                    style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }}
                    onClick={() => removeQuestion(i)}>
                    Remove
                  </button>
                )}
              </div>

              <textarea className="input" placeholder="Enter question text here..."
                value={q.question_text}
                onChange={e => changeField(i, "question_text", e.target.value)}
                rows={2} style={{ marginBottom: "0.65rem" }} />

              <select className="input" value={q.question_type}
                onChange={e => changeField(i, "question_type", e.target.value)}
                style={{ marginBottom: "0.65rem" }}>
                <option value="MCQ">MCQ (Multiple Choice)</option>
                <option value="DESCRIPTIVE">Descriptive (Written Answer)</option>
              </select>

              {q.question_type === "MCQ" && (
                <>
                  <input className="input" placeholder="Correct Answer - Option A"
                    value={q.option_a}
                    onChange={e => changeField(i, "option_a", e.target.value)}
                    style={{ marginBottom: "0.55rem",
                      borderColor: "rgba(16,185,129,0.4)",
                      background: "rgba(220,252,231,0.3)" }} />

                  <div style={{ display: "flex", gap: "0.45rem", marginBottom: "0.55rem", flexWrap: "wrap" }}>
                    <button className="btn btn-sm" onClick={() => openQModal(i)}
                      style={{ background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe" }}>
                      AI Full Question
                    </button>
                    <button className="btn btn-sm" disabled={optLoadingIdx === i}
                      onClick={() => generateOptions(i)}
                      style={{ background: "#dbeafe", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                      {optLoadingIdx === i
                        ? <><span className="spin spin-blue" style={{ width: 12, height: 12 }} /> Generating...</>
                        : "AI Options"
                      }
                    </button>
                  </div>

                  {["b", "c", "d"].map(opt => (
                    <input key={opt} className="input"
                      placeholder={`Option ${opt.toUpperCase()}`}
                      value={q[`option_${opt}`]}
                      onChange={e => changeField(i, `option_${opt}`, e.target.value)}
                      style={{ marginBottom: "0.5rem" }} />
                  ))}
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={addQuestion}>
            Add Question
          </button>
          <button className="btn btn-success" onClick={handleSave} disabled={saving}>
            {saving
              ? <><span className="spin" /> Saving Exam...</>
              : `Save Exam (${questions.length} question${questions.length !== 1 ? "s" : ""})`
            }
          </button>
        </div>

      </div>

      {/* AI Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)",
              display: "flex", justifyContent: "center", alignItems: "center",
              zIndex: 50, padding: "1rem" }}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="glass-strong" style={{ width: "100%", maxWidth: 440, padding: "1.75rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "1.25rem", color: "#0f172a" }}>
                {modalType === "question" ? "Generate Single Question" : "Generate Full Exam with AI"}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                <div>
                  <label className="input-label">Topic</label>
                  <input className="input" placeholder="e.g. Newton's Laws"
                    value={topic} onChange={e => setTopic(e.target.value)} />
                </div>
                {modalType === "exam" && (<>
                  <div>
                    <label className="input-label">Subject</label>
                    <input className="input" placeholder="e.g. Physics"
                      value={subject} onChange={e => setSubject(e.target.value)} />
                  </div>
                  <div>
                    <label className="input-label">Difficulty</label>
                    <select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Number of Questions</label>
                    <input className="input" type="number" min="1" max="20"
                      value={aiCount} onChange={e => setAiCount(e.target.value)} />
                  </div>
                </>)}
              </div>
              {generating && (
                <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.78rem", marginTop: "0.9rem" }}>
                  AI is working, this may take 5 to 15 seconds
                </p>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "1.4rem" }}>
                <button className="btn btn-secondary btn-sm" disabled={generating} onClick={() => setModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" disabled={generating}
                  onClick={runGenerate} style={{ minWidth: 110 }}>
                  {generating ? <><span className="spin" /> Generating...</> : "Generate"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
