import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function ProfilePage() {

  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/exam/profile")
      .then(res => setData(res.data))
      .catch(err => {
        console.error(err);
        alert("Failed to load profile");
      });
  }, []);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  if (!data) {
    return (
      <div className="h-screen flex justify-center items-center text-xl">
        Loading profile...
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center p-6">

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-xl rounded-2xl p-10 w-full max-w-md text-center"
      >

        {/* Avatar */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow">
          {data.user.name.charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <h2 className="text-2xl font-bold text-gray-800">
          {data.user.name}
        </h2>

        {/* Email */}
        <p className="text-gray-500 mb-6">
          {data.user.email}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">

          <div className="bg-blue-50 p-4 rounded-xl">
            <p className="text-xl font-bold text-blue-600">
              {data.created}
            </p>
            <p className="text-sm text-gray-600">
              Exams Created
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-xl">
            <p className="text-xl font-bold text-green-600">
              {data.attempted}
            </p>
            <p className="text-sm text-gray-600">
              Exams Attempted
            </p>
          </div>

        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">

          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gray-200 py-2 rounded-lg hover:bg-gray-300 transition"
          >
            Back to Dashboard
          </button>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>

        </div>

      </motion.div>

    </div>
  );
}