import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function ExamBuilder() {

  const { code } = useParams();
  const [examId, setExamId] = useState(null);

  const emptyQuestion = {
    question_text: "",
    question_type: "MCQ",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A"
  };

  const [questions, setQuestions] = useState([emptyQuestion]);
  const [showPreview, setShowPreview] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [currentIndex, setCurrentIndex] = useState(null);

  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [count, setCount] = useState(5);

  // Get examId
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await api.post("/exam/join", { exam_code: code });
        setExamId(res.data.exam.exam_id);
      } catch {
        alert("Invalid exam code");
      }
    };
    fetchExam();
  }, [code]);

  // Update question
  const handleChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const addNewQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Save all questions
  const handleSubmitAll = async () => {

    if (!examId) return alert("Exam not loaded");

    try {

      for (let q of questions) {

        await api.post("/exam/add-question", {
          exam_id: examId,
          question_text: q.question_text,
          question_type: q.question_type,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option
        });

      }

      alert("Questions saved successfully");
      setQuestions([emptyQuestion]);

    } catch {
      alert("Failed to save questions");
    }
  };

  // AI options
  const generateOptions = async (index) => {

    const q = questions[index];

    if (!q.question_text || !q.option_a) {
      return alert("Enter question and correct answer first");
    }

    try {

      const res = await api.post("/exam/ai-generate-options", {
        question: q.question_text,
        correct_answer: q.option_a
      });

      const wrong = res.data.wrong_options;

      handleChange(index, "option_b", wrong[0] || "");
      handleChange(index, "option_c", wrong[1] || "");
      handleChange(index, "option_d", wrong[2] || "");

    } catch {
      alert("AI option generation failed");
    }
  };

  // Open modal
  const openQuestionModal = (index) => {
    setModalType("question");
    setCurrentIndex(index);
    setShowModal(true);
  };

  const openExamModal = () => {
    setModalType("exam");
    setShowModal(true);
  };

  // Handle AI generate
  const handleGenerate = async () => {

  try {

    // SINGLE QUESTION AI
    
    if (modalType === "question") {

      const res = await api.post("/exam/ai-generate-question", {
        topic
      });

      const data = res.data;

      if (currentIndex === null || currentIndex === undefined) {
        alert("Invalid question index");
        return;
      }

      const updated = [...questions];

      updated[currentIndex] = {
        ...updated[currentIndex],
        question_text: data.question,
        option_a: data.options[0]?.replace("A:", "").trim() || "",
        option_b: data.options[1]?.replace("B:", "").trim() || "",
        option_c: data.options[2]?.replace("C:", "").trim() || "",
        option_d: data.options[3]?.replace("D:", "").trim() || "",
        correct_option: data.correct || "A"
      };

      setQuestions(updated);
    }

    
    // FULL EXAM AI
    
    if (modalType === "exam") {

      const res = await api.post("/exam/ai-generate-full-exam", {
        subject,
        topic,
        difficulty,
        count
      });

      const generated = res.data.questions;

      if (!generated || generated.length === 0) {
        alert("No questions generated");
        return;
      }

      const formatted = generated.map(q => ({
        question_text: q.question_text,
        question_type: "MCQ",
        option_a: q.options[0]?.replace("A:", "").trim() || "",
        option_b: q.options[1]?.replace("B:", "").trim() || "",
        option_c: q.options[2]?.replace("C:", "").trim() || "",
        option_d: q.options[3]?.replace("D:", "").trim() || "",
        correct_option: q.correct || "A"
      }));

      setQuestions(formatted);
      setShowPreview(true);
    }

    setShowModal(false);

  } catch (err) {

    console.log("FULL ERROR:", err);

    if (err.response) {
      console.log("BACKEND ERROR:", err.response.data);
      alert(err.response.data.error || "Backend error");
    } else {
      alert("Server not reachable");
    }

  }
};

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-10">

      <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow">

        <h1 className="text-2xl font-bold mb-6 text-center">
          Exam Builder (Code: {code})
        </h1>

        {/* Top actions */}
        <div className="flex gap-4 mb-6">

          <button
            onClick={openExamModal}
            className="bg-purple-600 text-white px-4 py-2 rounded"
          >
            Generate Full Exam
          </button>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="bg-gray-800 text-white px-4 py-2 rounded"
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>

        </div>

        {/* Questions */}
        {questions.map((q, index) => (

          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border p-4 rounded-lg mb-6 bg-gray-50"
          >

            <div className="flex justify-between mb-2">
              <h2>Question {index + 1}</h2>

              {questions.length > 1 && (
                <button onClick={() => removeQuestion(index)} className="text-red-500">
                  Remove
                </button>
              )}
            </div>

            <textarea
              placeholder="Enter question"
              value={q.question_text}
              onChange={(e)=>handleChange(index,"question_text",e.target.value)}
              className="w-full border p-2 rounded mb-2"
            />

            <select
              value={q.question_type}
              onChange={(e)=>handleChange(index,"question_type",e.target.value)}
              className="w-full border p-2 rounded mb-2"
            >
              <option value="MCQ">MCQ</option>
              <option value="DESCRIPTIVE">Descriptive</option>
            </select>

            {q.question_type === "MCQ" && (
              <>
                <input
                  placeholder="Correct Answer (Option A)"
                  value={q.option_a}
                  onChange={(e)=>handleChange(index,"option_a",e.target.value)}
                  className="border p-2 w-full mb-2"
                />

                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => openQuestionModal(index)}
                    className="bg-indigo-600 text-white px-3 py-1 rounded"
                  >
                    AI Full Question
                  </button>

                  <button
                    onClick={() => generateOptions(index)}
                    className="bg-purple-500 text-white px-3 py-1 rounded"
                  >
                    AI Options
                  </button>
                </div>

                <input placeholder="Option B" value={q.option_b}
                  onChange={(e)=>handleChange(index,"option_b",e.target.value)}
                  className="border p-2 w-full mb-2" />

                <input placeholder="Option C" value={q.option_c}
                  onChange={(e)=>handleChange(index,"option_c",e.target.value)}
                  className="border p-2 w-full mb-2" />

                <input placeholder="Option D" value={q.option_d}
                  onChange={(e)=>handleChange(index,"option_d",e.target.value)}
                  className="border p-2 w-full mb-2" />
              </>
            )}

          </motion.div>

        ))}

        {/* Actions */}
        <div className="flex gap-4">
          <button onClick={addNewQuestion} className="bg-blue-600 text-white px-4 py-2 rounded">
            Add Question
          </button>

          <button onClick={handleSubmitAll} className="bg-green-600 text-white px-4 py-2 rounded">
            Save All
          </button>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-4">Preview</h2>

            {questions.map((q, i) => (
              <div key={i} className="border p-4 mb-4 rounded bg-white">
                <p>{i+1}. {q.question_text}</p>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">

          <div className="bg-white p-6 rounded-xl w-96">

            <h2 className="text-lg font-bold mb-4">
              {modalType === "question" ? "Generate Question" : "Generate Exam"}
            </h2>

            <input
              placeholder="Topic"
              value={topic}
              onChange={(e)=>setTopic(e.target.value)}
              className="border p-2 w-full mb-3"
            />

            {modalType === "exam" && (
              <>
                <input placeholder="Subject" value={subject}
                  onChange={(e)=>setSubject(e.target.value)}
                  className="border p-2 w-full mb-2" />

                <select value={difficulty}
                  onChange={(e)=>setDifficulty(e.target.value)}
                  className="border p-2 w-full mb-2">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                <input type="number" value={count}
                  onChange={(e)=>setCount(e.target.value)}
                  className="border p-2 w-full mb-2" />
              </>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={()=>setShowModal(false)}>Cancel</button>
              <button onClick={handleGenerate} className="bg-blue-600 text-white px-3 py-1 rounded">
                Generate
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}