import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function ExamPage() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [cheatCount, setCheatCount] = useState(0);
  const [examFinished, setExamFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const fetchQuestions = async () => {
      try {

        const res = await api.get(`/exam/questions/${id}`);

        setQuestions(Array.isArray(res.data.questions) ? res.data.questions : []);

        if (res.data.remaining_seconds) {
          setTimeLeft(res.data.remaining_seconds);
        }

        if (res.data.answers) {
          setAnswers(res.data.answers);
        }

      } catch (err) {

        console.error("Exam load error:", err);

        if (err.response) {
          const msg = err.response.data.error;

          if (msg === "Exam already completed") {
            alert("You have already completed this exam");
            navigate("/dashboard");
          } else if (msg && msg.includes("Time over")) {
            alert("Exam time is already over");
            navigate("/dashboard");
          } else {
            alert(msg || "Failed to load exam");
          }
        }

      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();

  }, [id, navigate]);

  const handleAnswer = async (qid, optionText) => {

    setAnswers(prev => ({
      ...prev,
      [qid]: optionText
    }));

    try {
      await api.post("/exam/save-answer", {
        exam_id: id,
        question_id: qid,
        selected_option: optionText   // ✅ TEXT
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTextAnswer = async (qid, text) => {

    setAnswers(prev => ({ ...prev, [qid]: text }));

    try {
      await api.post("/exam/save-answer", {
        exam_id: id,
        question_id: qid,
        text_answer: text
      });
    } catch (err) {
      console.error(err);
    }
  };

  const submitExam = async () => {

    try {
      setExamFinished(true);

      await api.post("/exam/submit", {
        exam_id: id
      });

      navigate("/dashboard", { replace: true });

    } catch (err) {
      console.error(err);
    }
  };

  const autoSubmitExam = async () => {

    if (examFinished) return;

    try {

      setExamFinished(true);

      await api.post("/exam/submit", {
        exam_id: id
      });

      navigate("/dashboard", { replace: true });

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {

    if (loading) return;

    const timer = setInterval(() => {

      setTimeLeft(prev => {

        if (prev <= 1) {
          clearInterval(timer);
          autoSubmitExam();
          return 0;
        }

        return prev - 1;
      });

    }, 1000);

    return () => clearInterval(timer);

  }, [loading]);
useEffect(() => {

  if (loading) return;

  let count = 0;
  let lastTriggerTime = 0;

  const handleCheat = async () => {

    if (examFinished) return;
    const now = Date.now();

    if (now - lastTriggerTime < 800) return;

    lastTriggerTime = now;

    count += 1;
    setCheatCount(count);

    alert(`Tab switch detected (${count}/3)`);

    try {
      await api.post("/exam/log-cheat", {
        exam_id: id,
        event_type: "tab_switch"
      });
    } catch (err) {
      console.error("Cheat log failed");
    }

    if (count >= 3) {
      autoSubmitExam();
    }
  };

  // 1. Detect tab change
  const handleVisibility = () => {
    if (document.hidden) {
      handleCheat();
    }
  };

  // 2. Detect window blur (backup)
  const handleBlur = () => {
    handleCheat();
  };

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("blur", handleBlur);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("blur", handleBlur);
  };

}, [loading, examFinished, id]);

  useEffect(() => {

    const handleKeyDown = (e) => {

      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a"].includes(key)) {
        e.preventDefault();
        alert("Copy, paste, and selection are disabled during the exam");
      }
    };

    const handleContextMenu = (e) => e.preventDefault();
    const handleSelectStart = (e) => e.preventDefault();

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
    };

  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl">
        Loading exam...
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 p-10 select-none">

      <div className="max-w-5xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between mb-10"
        >
          <h1 className="text-3xl font-bold">Online Examination</h1>

          <div className="text-right">
            <p className="text-sm">Time Remaining</p>
            <p className="text-2xl text-red-600 font-bold">
              {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </p>
          </div>
        </motion.div>

        {questions.map((q, i) => {

          const type = (q.question_type || "").toLowerCase();

          return (
            <motion.div
              key={q.question_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 mb-6 rounded-xl shadow"
            >

              <h2 className="mb-4 font-semibold">
                {i + 1}. {q.question_text}
              </h2>

              {type === "mcq" && ["A","B","C","D"].map(opt => {

                const optionText = q[`option_${opt.toLowerCase()}`];

                return (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(q.question_id, optionText)}
                    className={`block w-full text-left p-3 border rounded mb-2
                      ${
                        answers[q.question_id] === optionText
                          ? "bg-blue-500 text-white"
                          : "hover:bg-blue-100"
                      }`}
                  >
                    {opt}. {optionText}
                  </button>
                );

              })}

              {type === "descriptive" && (
                <textarea
                  className="w-full border p-3 rounded"
                  placeholder="Write answer..."
                  value={answers[q.question_id] || ""}
                  onChange={(e) =>
                    handleTextAnswer(q.question_id, e.target.value)
                  }
                />
              )}

            </motion.div>
          );

        })}

        <div className="text-center mt-10">
          <button
            onClick={submitExam}
            className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700"
          >
            Submit Exam
          </button>
        </div>

      </div>
    </div>
  );
}