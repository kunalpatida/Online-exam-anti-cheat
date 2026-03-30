import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function JoinExam() {

  const navigate = useNavigate();

  const [code, setCode] = useState("");

  const handleJoin = async (e) => {

    e.preventDefault();

    if (!code) {
      alert("Please enter exam code");
      return;
    }

    try {

      const response = await api.post("/exam/join", {
        exam_code: code
        });

      const exam = response.data.exam;

        if (!exam || !exam.exam_id) {
            throw new Error("Invalid exam structure");
        }

        navigate(`/exam/${exam.exam_id}`);

    } catch (error) {

        console.log("ERROR:", error);

      alert("Invalid exam code");

      console.error(error);

    }

  };

  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100">

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md"
      >

        <h1 className="text-2xl font-bold mb-6 text-center">
          Enter Exam Code
        </h1>

        <form onSubmit={handleJoin} className="space-y-4">

          <input
            type="text"
            placeholder="Exam Code"
            value={code}
            onChange={(e)=>setCode(e.target.value.toUpperCase())}
            className="w-full border p-3 rounded-lg"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            Join Exam
          </button>

        </form>

      </motion.div>

    </div>

  );

}