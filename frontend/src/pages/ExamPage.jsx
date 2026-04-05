import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function ExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [cheatCount, setCheatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState("Online Examination");
  const finishedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/exam/questions/${id}`);
        setQuestions(res.data.questions || []);
        setTimeLeft(res.data.remaining_seconds || 0);
        if (res.data.answers) {
          const map = {};
          res.data.answers.forEach(a => {
            map[a.question_id] = a.selected_option || a.text_answer || "";
          });
          setAnswers(map);
        }
      } catch (err) {
        const msg = err.response?.data?.error || "";
        if (msg.includes("already completed") || msg.includes("Time over")) {
          alert(msg);
          navigate("/dashboard");
        }
      } finally { setLoading(false); }
    })();
  }, [id]);

  const autoSubmit = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      await api.post("/exam/submit", { exam_id: id });
    } catch {}
    navigate("/dashboard", { replace: true });
  };

  // Timer
  useEffect(() => {
    if (loading) return;
    const t = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(t); autoSubmit(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [loading]);

  // Cheat detection
  useEffect(() => {
    if (loading) return;
    let count = 0, lastTime = 0;
    const detect = async () => {
      if (finishedRef.current) return;
      const now = Date.now();
      if (now - lastTime < 800) return;
      lastTime = now;
      count++;
      setCheatCount(count);
      try { await api.post("/exam/log-cheat", { exam_id: id, event_type: "tab_switch" }); } catch {}
      if (count >= 3) { alert("Exam terminated: 3 tab switch violations"); autoSubmit(); }
      else alert(`⚠️ Tab switch detected (${count}/3)`);
    };
    const onVis = () => { if (document.hidden) detect(); };
    const onBlur = () => detect();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [loading]);

  // Disable copy/paste
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && ["c","v","x","a"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const noCtx = e => e.preventDefault();
    const noSel = e => e.preventDefault();
    document.addEventListener("keydown", onKey);
    document.addEventListener("contextmenu", noCtx);
    document.addEventListener("selectstart", noSel);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("contextmenu", noCtx);
      document.removeEventListener("selectstart", noSel);
    };
  }, []);

  const saveAnswer = async (qid, val, isText = false) => {
    setAnswers(p => ({ ...p, [qid]: val }));
    try {
      await api.post("/exam/save-answer", {
        exam_id: id, question_id: qid,
        ...(isText ? { text_answer: val } : { selected_option: val }),
      });
    } catch {}
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerClass = timeLeft < 60 ? "timer" : timeLeft < 300 ? "timer warn" : "timer safe";

  const answered = Object.keys(answers).filter(k => answers[k]).length;
  const progress = questions.length ? (answered / questions.length) * 100 : 0;

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text-muted)" }}>Loading exam...</p>
      </div>
    </div>
  );

  return (
    <div style={{ position: "relative", zIndex: 1, userSelect: "none" }}>
      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(15,12,41,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--glass-border)", padding: "12px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>Online Examination</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{answered}/{questions.length} answered</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Time Remaining</div>
            <div className={timerClass} style={{ fontSize: "1.6rem" }}>
              {mins}:{secs < 10 ? `0${secs}` : secs}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 800, margin: "8px auto 0" }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Cheat warning */}
      {cheatCount > 0 && (
        <div style={{ background: "rgba(248,113,113,0.15)", borderBottom: "1px solid rgba(248,113,113,0.3)", padding: "10px 24px", textAlign: "center", fontSize: 13, color: "var(--danger)" }}>
          ⚠️ Tab switch warning: {cheatCount}/3 — exam auto-submits at 3
        </div>
      )}

      {/* Questions */}
      <div className="page">
        <div className="container-md">
          {questions.map((q, i) => (
            <div key={q.question_id} className="glass anim-fade-up" style={{ padding: "24px", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <span className="badge badge-purple" style={{ flexShrink: 0 }}>Q{i + 1}</span>
                <p style={{ fontWeight: 500, lineHeight: 1.5 }}>{q.question_text}</p>
              </div>

              {(q.question_type || "").toLowerCase() === "mcq" ? (
                ["a","b","c","d"].map(opt => {
                  const text = q[`option_${opt}`];
                  if (!text) return null;
                  return (
                    <button key={opt} className={`option-btn ${answers[q.question_id] === text ? "selected" : ""}`}
                      onClick={() => saveAnswer(q.question_id, text)}>
                      <span style={{ fontWeight: 600, marginRight: 8, opacity: 0.6 }}>{opt.toUpperCase()}.</span>
                      {text}
                    </button>
                  );
                })
              ) : (
                <textarea className="input" rows={5} placeholder="Write your answer here..."
                  value={answers[q.question_id] || ""}
                  onChange={e => saveAnswer(q.question_id, e.target.value, true)} />
              )}
            </div>
          ))}

          <div style={{ textAlign: "center", paddingTop: 16, paddingBottom: 48 }}>
            <button className="btn btn-success btn-lg"
              onClick={() => { if (window.confirm("Submit exam? You cannot change answers after submitting.")) autoSubmit(); }}>
              ✓ Submit Exam
            </button>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10 }}>
              {questions.length - answered} question{questions.length - answered !== 1 ? "s" : ""} unanswered
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
