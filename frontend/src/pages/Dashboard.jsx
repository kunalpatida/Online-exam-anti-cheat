import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function Dashboard() {

  const navigate = useNavigate();

  const [examCode, setExamCode] = useState("");
  const [exams, setExams] = useState([]);
  const [user, setUser] = useState(null);

  // ================================
  // LOAD USER + EXAMS
  // ================================
  useEffect(() => {

    const loadData = async () => {

      try {

        const profileRes = await api.get("/exam/profile");
        setUser(profileRes.data.user);

        const examRes = await api.get("/exam/list");
        setExams(Array.isArray(examRes.data) ? examRes.data : []);

      } catch (err) {
        console.error("Dashboard load error:", err);
      }

    };

    loadData();

  }, []);

  // ================================
  // JOIN EXAM
  // ================================
  const handleJoinExam = async () => {

    if (!examCode) {
      alert("Enter exam code");
      return;
    }

    try {

      const res = await api.post("/exam/join", {
        exam_code: examCode
      });

      navigate(`/exam/${res.data.exam.exam_id}`);

    } catch {
      alert("Invalid or expired exam code");
    }
  };

  // ================================
  // COPY CODE
  // ================================
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert("Copied: " + code);
  };

  // ================================
  // LOGOUT
  // ================================
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 p-8">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-10"
      >

        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Welcome {user?.name || "User"}
          </p>
        </div>

        {/* 🔥 AVATAR */}
        <Link to="/profile">
          <div
            title="Profile"
            className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-lg font-bold shadow-md hover:scale-110 transition"
          >
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
        </Link>

      </motion.div>


      {/* ACTION CARDS */}
      <div className="grid md:grid-cols-2 gap-8 mb-14">

        {/* JOIN EXAM */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition"
        >

          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Join Exam
          </h2>

          <input
            type="text"
            placeholder="Enter exam code..."
            value={examCode}
            onChange={(e) => setExamCode(e.target.value)}
            className="border w-full p-3 rounded-lg mb-4 focus:ring-2 focus:ring-blue-400 outline-none"
          />

          <button
            onClick={handleJoinExam}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full hover:bg-blue-700 transition"
          >
            Join Now
          </button>

        </motion.div>


        {/* CREATE EXAM */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition"
        >

          <h2 className="text-xl font-semibold mb-2 text-gray-800">
            Create Exam
          </h2>

          <p className="text-gray-500 mb-4 text-sm">
            Create a new exam and share it with students.
          </p>

          <button
            onClick={() => navigate("/create-exam")}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition w-full"
          >
            Create New Exam
          </button>

        </motion.div>

      </div>


      {/* EXAMS TABLE */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        <h2 className="text-2xl font-semibold mb-6 text-gray-800">
          My Exams
        </h2>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">

          <table className="w-full text-left">

            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="p-4">Title</th>
                <th>Duration</th>
                <th>Marks</th>
                <th>Code</th>
                <th className="text-center">Attempts</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>

            <tbody>

              {exams.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-400">
                    No exams created yet
                  </td>
                </tr>
              ) : (

                exams.map((exam) => (

                  <tr
                    key={exam.exam_id}
                    className="border-t hover:bg-gray-50 transition"
                  >

                    <td className="p-4 font-medium text-gray-800">
                      {exam.title}
                    </td>

                    <td>{exam.duration_minutes} min</td>

                    <td>{exam.total_marks}</td>

                    <td className="font-mono text-blue-600">
                      {exam.exam_code}
                    </td>

                    <td className="text-center">
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">
                        {exam.attempts || 0}
                      </span>
                    </td>

                    <td className="text-center flex justify-center gap-2 py-3">

                      <button
                        onClick={() => copyCode(exam.exam_code)}
                        className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 text-sm"
                      >
                        Copy
                      </button>

                      <Link
                        to={`/results/${exam.exam_id}`}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Results
                      </Link>

                      <Link
                        to={`/analytics/${exam.exam_id}`}
                        className="bg-purple-500 text-white px-3 py-1 rounded text-sm"
                      >
                        Analytics
                      </Link>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </motion.div>
      
    </div>
  );
}