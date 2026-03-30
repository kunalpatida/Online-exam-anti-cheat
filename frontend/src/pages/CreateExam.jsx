import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function CreateExam() {

  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [marks, setMarks] = useState(10);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const handleCreate = async (e) => {

    e.preventDefault();

    try {

      const response = await api.post("/exam/create", {
        title: title,
        duration_minutes: duration,
        total_marks: marks,
        start_time: startTime || null,
        end_time: endTime || null
      });

      const code = response.data.exam_code;

      alert(`Exam created!\nExam Code: ${response.data.exam_code}`);

      navigate(`/exam-builder/${response.data.exam_code}`);

    } catch (error) {

        console.error("CREATE EXAM ERROR:", error);

        if (error.response) {
            alert(error.response.data.error || JSON.stringify(error.response.data));
        } else {
            alert("Server not reachable");
        }

    }

    };

    return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100">

      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-lg">

        <h1 className="text-2xl font-bold mb-6 text-center">
          Create Exam
        </h1>

        <form onSubmit={handleCreate} className="space-y-4">

          <input
            type="text"
            placeholder="Exam Title"
            value={title}
            onChange={(e)=>setTitle(e.target.value)}
            className="w-full border p-3 rounded-lg"
            required
          />

          <input
            type="number"
            placeholder="Duration (minutes)"
            value={duration}
            onChange={(e)=>setDuration(e.target.value)}
            className="w-full border p-3 rounded-lg"
          />

          <input
            type="number"
            placeholder="Total Marks"
            value={marks}
            onChange={(e)=>setMarks(e.target.value)}
            className="w-full border p-3 rounded-lg"
          />

          <label className="text-sm text-gray-600">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e)=>setStartTime(e.target.value)}
            className="w-full border p-3 rounded-lg"
          />

          <label className="text-sm text-gray-600">End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e)=>setEndTime(e.target.value)}
            className="w-full border p-3 rounded-lg"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            Create Exam
          </button>

        </form>

      </div>

    </div>

  );

}