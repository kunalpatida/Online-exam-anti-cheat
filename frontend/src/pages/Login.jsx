import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../components/Toast";

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      toast("Welcome back 👋", "success");
      navigate("/dashboard");
    } catch (err) {
      toast(err.response?.data?.error || "Invalid credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* LEFT SIDE (Branding) */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-purple-600 to-indigo-700 text-white items-center justify-center p-10">
        <div>
          <h1 className="text-4xl font-bold mb-4">SmartExam AI</h1>
          <p className="text-lg opacity-90">
            Generate exams, test knowledge, and analyze performance — all in one place.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE (Login Form) */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-6">
        <div className="w-full max-w-md">

          <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-6">Login to your account</p>

          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block mb-1 text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block mb-1 text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 cursor-pointer text-sm text-gray-500"
                >
                  {showPass ? "Hide" : "Show"}
                </span>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end text-sm">
              <Link to="/forgot-password" className="text-purple-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>

          {/* Register */}
          <p className="text-sm text-center mt-6 text-gray-500">
            Don’t have an account?{" "}
            <Link to="/register" className="text-purple-600 hover:underline">
              Create one
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
