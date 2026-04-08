import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";

const DRAFT_KEY  = code => `exam_draft_${code}`;
const EXAMID_KEY = code => `exam_id_${code}`;

const emptyQuestion = () => ({
  question_text:  "",
  question_type:  "MCQ",
  option_a:       "",
  option_b:       "",
  option_c:       "",
  option_d:       "",
  correct_option: "A",
});

export default function ExamBuilder() {
  const { code }   = useParams();
  const navigate   = useNavigate();

  const [examId,        setExamId]        = useState(null);
  const [questions,     setQuestions]     = useState([emptyQuestion()]);
  const [preview,       setPreview]       = useState(false);
  const [modal,         setModal]         = useState(false);
  const [modalType,     setModalType]     = useState("");
  const [curIdx,        setCurIdx]        = useState(null);
  const [topic,         setTopic]         = useState("");
  const [subject,       setSubject]       = useState("");
  const [difficulty,    setDifficulty]    = useState("easy");
  const [count,         setCount]         = useState(5);
  const [generating,    setGenerating]    = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [optLoadingIdx, setOptLoadingIdx] = useState(null);
  const [toast,         setToast]         = useState(null);
  const [draftSaved,    setDraftSaved]    = useState(false);

  const showToast = (msg, type = "s") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Step 1: Try to get exam_id from localStorage (set by CreateExam page)
  // Step 2: If not found, fetch from backend using the exam code
  useEffect(() => {
    const stored = localStorage.getItem(EXAMID_KEY(code));

    if (stored) {
      setExamId(parseInt(stored, 10));
      return;
    }

    // Fallback: fetch exam by code using the teacher-safe endpoint
    api.get(`/exam/get-by-code/${code}`)
      .then(r => {
        setExamId(r.data.exam.exam_id);
        // Cache it for next time
        localStorage.setItem(EXAMID_KEY(code), String(r.data.exam.exam_id));
      })
      .catch(() => showToast("Could not load exam", "e"));

  }, [code]);

  // Restore draft questions from localStorage (survives page refresh)
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY(code));
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.questions && parsed.questions.length > 0) {
          setQuestions(parsed.questions);
          showToast("Draft restored", "i");
        }
      }
    } catch {}
  }, [code]);

  // Auto-save questions to localStorage on every change
  useEffect(() => {
    if (!questions.length) return;
    try {
      localStorage.setItem(DRAFT_KEY(code), JSON.stringify({ questions, ts: Date.now() }));
      setDraftSaved(true);
      const t = setTimeout(() => setDraftSaved(false), 1400);
      return () => clearTimeout(t);
    } catch {}
  }, [questions, code]);

  const changeField = useCallback((index, field, value) => {
    setQuestions(qs => {
      const updated = [...qs];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const addQuestion    = () => setQuestions(qs => [...qs, emptyQuestion()]);
  const removeQuestion = (index) => {
    if (questions.length === 1) return showToast("At least one question is required", "e");
    setQuestions(qs => qs.filter((_, i) => i !== index));
  };

  const saveAllQuestions = async () => {
    if (!examId) return showToast("Exam not loaded yet. Please wait.", "e");

    const empty = questions.filter(q => !q.question_text.trim());
    if (empty.length > 0) return showToast(`${empty.length} question(s) have empty text`, "e");

    setSaving(true);

    try {
      for (const q of questions) {
        await api.post("/exam/add-question", {
          exam_id:        examId,
          question_text:  q.question_text,
          question_type:  q.question_type,
          option_a:       q.option_a       || null,
          option_b:       q.option_b       || null,
          option_c:       q.option_c       || null,
          option_d:       q.option_d       || null,
          correct_option: q.correct_option,
        });
      }

      showToast(`${questions.length} question(s) saved successfully`);

      // Clear drafts after successful save
      localStorage.removeItem(DRAFT_KEY(code));
      localStorage.removeItem(EXAMID_KEY(code));

      setQuestions([emptyQuestion()]);

    } catch (err) {
      showToast(err.response?.data?.error || "Failed to save questions", "e");
    } finally {
      setSaving(false);
    }
  };

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

  const openQuestionModal = (index) => {
    setModalType("question"); setCurIdx(index); setTopic(""); setModal(true);
  };
  const openExamModal = () => {
    setModalType("exam"); setTopic(""); setSubject(""); setModal(true);
  };

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
          return updated;
        });
        showToast("Question generated");

      } else {
        const res       = await api.post("/exam/ai-generate-full-exam", {
          subject,
          topic,
          difficulty,
          count: Number(count),
        });
        const generated = res.data.questions;

        if (!generated || generated.length === 0) {
          return showToast("No questions returned", "e");
        }

        setQuestions(generated.map(q => ({
          question_text:  q.question_text,
          question_type:  "MCQ",
          option_a:       q.options[0]?.replace(/^A:\s*/i, "").trim() || "",
          option_b:       q.options[1]?.replace(/^B:\s*/i, "").trim() || "",
          option_c:       q.options[2]?.replace(/^C:\s*/i, "").trim() || "",
          option_d:       q.options[3]?.replace(/^D:\s*/i, "").trim() || "",
          correct_option: q.correct || "A",
        })));

        setPreview(true);
        showToast(`${generated.length} questions generated`);
      }

      setModal(false);

    } catch (err) {
      showToast(err.response?.data?.error || "Generation failed. Please try again.", "e");
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
            <h1 style={{ fontWeight: 800, fontSize: "1.4rem", letterSpacing: "-0.03em", color: "#0f172a" }}>
              Exam Builder
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", background: "#dbeafe", border: "1px solid #bfdbfe",
                borderRadius: 6, padding: "0.18rem 0.55rem", fontSize: "0.82rem", color: "#2563eb", fontWeight: 600 }}>
                {code}
              </span>
              {examId && (
                <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                  exam loaded
                </span>
              )}
              {draftSaved && (
                <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>draft saved</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn btn-sm" onClick={openExamModal}
              style={{ background: "#dbeafe", color: "#2563eb", border: "1px solid #bfdbfe" }}>
              AI Full Exam
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreview(p => !p)}>
              {preview ? "Hide Preview" : "Preview"}
            </button>
          </div>
        </motion.div>

        {/* Question Cards */}
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
                      background: "rgba(220,252,231,0.3)" }}
                  />

                  <div style={{ display: "flex", gap: "0.45rem", marginBottom: "0.55rem", flexWrap: "wrap" }}>
                    <button className="btn btn-sm" onClick={() => openQuestionModal(i)}
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
                      style={{ marginBottom: "0.5rem" }}
                    />
                  ))}
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
          <button className="btn btn-secondary" onClick={addQuestion}>Add Question</button>
          <button className="btn btn-success" onClick={saveAllQuestions} disabled={saving}>
            {saving ? <><span className="spin" /> Saving...</> : "Save All Questions"}
          </button>
        </div>

        <AnimatePresence>
          {preview && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ marginTop: "1.75rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.85rem", color: "#0f172a" }}>
                Preview
              </h2>
              {questions.map((q, i) => (
                <div key={i} className="glass" style={{ padding: "1.1rem", marginBottom: "0.65rem" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem",
                    marginBottom: q.question_type === "MCQ" ? "0.65rem" : 0, color: "#0f172a" }}>
                    {i + 1}. {q.question_text || <span style={{ color: "#94a3b8" }}>No text entered</span>}
                  </p>
                  {q.question_type === "MCQ" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                      {["a", "b", "c", "d"].map(opt => q[`option_${opt}`] && (
                        <span key={opt} style={{ fontSize: "0.8rem", padding: "0.35rem 0.65rem", borderRadius: 7,
                          background: opt === "a" ? "#dcfce7" : "#f8fafc",
                          color:      opt === "a" ? "#15803d"  : "#475569",
                          border:     opt === "a" ? "1px solid #bbf7d0" : "1px solid #e2e8f0" }}>
                          {opt.toUpperCase()}. {q[`option_${opt}`]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
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
                {modalType === "question" ? "Generate Single Question" : "Generate Full Exam"}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                <div>
                  <label className="input-label">Topic</label>
                  <input className="input" placeholder="e.g. Newton's Laws"
                    value={topic} onChange={e => setTopic(e.target.value)} />
                </div>
                {modalType === "exam" && (
                  <>
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
                        value={count} onChange={e => setCount(e.target.value)} />
                    </div>
                  </>
                )}
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
