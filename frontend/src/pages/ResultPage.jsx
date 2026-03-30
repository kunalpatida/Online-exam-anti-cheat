import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function ResultPage() {

  const { id } = useParams();

  const [results, setResults] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [marks, setMarks] = useState({});
  const [evaluated, setEvaluated] = useState({});

  // FETCH RESULTS
  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get(`/exam/results/${id}`);
        setResults(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchResults();
  }, [id]);

  // FETCH ANSWERS
  useEffect(() => {
    const fetchAnswers = async () => {
      try {
        const res = await api.get(`/exam/answers/${id}`);
        setAnswers(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load answers");
      }
    };
    fetchAnswers();
  }, [id]);

  // 🔥 CALCULATE MAX MARKS PER QUESTION
  const maxMarks =
    results.length > 0
      ? results[0].total_marks / (answers.length || 1)
      : 0;

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-10">

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-bold text-center mb-10"
      >
        Exam Results
      </motion.h1>

      {/* RESULTS */}
      <div className="max-w-6xl mx-auto grid gap-6">

        {results.map((r, index) => {

          const percentage = r.total_marks
            ? Math.round((r.score / r.total_marks) * 100)
            : 0;

          const status = percentage >= 40 ? "Pass" : "Fail";

          return (

            <div key={index} className="bg-white p-6 rounded-xl shadow flex justify-between">

              <div>
                <h2 className="font-semibold">{r.name}</h2>
                <p className="text-gray-500 text-sm">{r.email}</p>
              </div>

              <div>
                <p className="font-bold text-blue-600">
                  {r.score} / {r.total_marks}
                </p>
                <p>{percentage}%</p>
              </div>

              <div>
                <span className={`px-3 py-1 rounded ${
                  status === "Pass"
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}>
                  {status}
                </span>
              </div>

              <div>
                Cheat: {r.cheat_count}
              </div>

            </div>

          );

        })}

      </div>

      {/* DESCRIPTIVE */}
      <div className="max-w-6xl mx-auto mt-12 bg-white p-6 rounded-xl shadow">

        <h2 className="text-xl font-bold mb-6">
          Descriptive Evaluation
        </h2>

        {answers.length === 0 && (
          <p>No descriptive answers found</p>
        )}

        {answers.map((a, index) => {

          const value = marks[a.question_id] || "";
          const isInvalid = value > maxMarks;

          return (

            <div key={index} className="mb-6 border-b pb-4">

              <h3 className="font-semibold">{a.name}</h3>

              <p className="mt-1">{a.question_text}</p>

              <p className="text-gray-600 mt-1">
                {a.text_answer}
              </p>

              {/* INPUT + BUTTON ROW */}
              <div className="flex items-center gap-3 mt-3">

                <input
                  type="number"
                  min="0"
                  placeholder={`Max ${maxMarks}`}
                  value={value}
                  disabled={evaluated[a.question_id] && !evaluated[`edit_${a.question_id}`]}
                  onChange={(e) => {

                    const val = Number(e.target.value);

                    setMarks(prev => ({
                      ...prev,
                      [a.question_id]: val
                    }));

                  }}
                  className={`border p-2 rounded w-32 ${
                    isInvalid ? "border-red-500" : ""
                  }`}
                />

                {/* SUBMIT BUTTON */}
                {!evaluated[a.question_id] && (
                  <button
                    disabled={!value || isInvalid}
                    onClick={async () => {

                      await api.post("/exam/evaluate", {
                        user_id: a.user_id,
                        exam_id: id,
                        question_id: a.question_id,
                        marks: value
                      });

                      setEvaluated(prev => ({
                        ...prev,
                        [a.question_id]: true
                      }));

                    }}
                    className={`px-4 py-2 rounded text-white ${
                      !value || isInvalid
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    Submit
                  </button>
                )}

                {/* EDIT BUTTON */}
                {evaluated[a.question_id] && !evaluated[`edit_${a.question_id}`] && (
                  <button
                    onClick={() =>
                      setEvaluated(prev => ({
                        ...prev,
                        [`edit_${a.question_id}`]: true
                      }))
                    }
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                )}

                {/* SAVE BUTTON AFTER EDIT */}
                {evaluated[`edit_${a.question_id}`] && (
                  <button
                    disabled={!value || isInvalid}
                    onClick={async () => {

                      await api.post("/exam/evaluate", {
                        user_id: a.user_id,
                        exam_id: id,
                        question_id: a.question_id,
                        marks: value
                      });

                      setEvaluated(prev => ({
                        ...prev,
                        [`edit_${a.question_id}`]: false
                      }));

                    }}
                    className={`px-4 py-2 rounded text-white ${
                      !value || isInvalid
                        ? "bg-gray-400"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    Save
                  </button>
                )}

              </div>

              {/* ERROR MESSAGE */}
              {isInvalid && (
                <p className="text-red-500 text-sm mt-1">
                  Max allowed marks is {maxMarks}
                </p>
              )}

            </div>

          );

        })}

      </div>

    </div>
  );
}