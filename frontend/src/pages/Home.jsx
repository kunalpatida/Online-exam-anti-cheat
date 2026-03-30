import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Home() {

  const features = [
    {
      title: "Create Exams Easily",
      desc: "Generate exams with unique codes for instant access."
    },
    {
      title: "AI Question Generation",
      desc: "Automatically generate smart MCQs using AI."
    },
    {
      title: "Anti-Cheating System",
      desc: "Detect tab switching and suspicious behavior."
    },
    {
      title: "MCQ + Descriptive",
      desc: "Support both objective and written answers."
    },
    {
      title: "Auto Evaluation",
      desc: "Instant result calculation with accuracy."
    },
    {
      title: "Analytics Dashboard",
      desc: "Track performance and cheating logs."
    }
  ];

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 overflow-hidden">

      {/* Background glow */}
      <div className="absolute top-20 left-20 w-40 h-40 bg-blue-300 blur-3xl opacity-20 rounded-full" />
      <div className="absolute bottom-20 right-20 w-60 h-60 bg-purple-300 blur-3xl opacity-20 rounded-full" />

      {/* Navbar */}
      <nav className="flex justify-between items-center px-10 py-5 bg-white/70 backdrop-blur-md shadow">

        <h1 className="text-xl font-bold text-blue-600">
          SmartExam AI
        </h1>

        <div className="flex gap-4">

          <Link
            to="/login"
            className="px-5 py-2 text-gray-700 hover:text-blue-600 transition"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Register
          </Link>

        </div>

      </nav>


      {/* HERO SECTION */}
      <section className="grid md:grid-cols-2 gap-10 items-center px-10 mt-24">

        {/* Left */}
        <div>

          <motion.h1
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold text-gray-800 mb-6 leading-tight"
          >
            AI Powered <span className="text-blue-600">Online Exam System</span>
          </motion.h1>

          <p className="text-gray-600 mb-8 text-lg">
            Build smart exams, prevent cheating, and evaluate instantly.
            Designed for modern education with AI integration.
          </p>

          <div className="flex gap-4">

            <Link
              to="/login"
              className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 shadow-lg transition"
            >
              Get Started
            </Link>

            <Link
              to="/register"
              className="border border-blue-600 text-blue-600 px-8 py-3 rounded-xl hover:bg-blue-50 transition"
            >
              Create Account
            </Link>

          </div>

        </div>

        {/* Right (AI highlight card) */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl border"
        >

          <h3 className="text-xl font-bold mb-4 text-purple-600">
            AI Features
          </h3>

          <ul className="space-y-3 text-gray-600">

            <li>Generate full exams instantly</li>
            <li>Create smart MCQ options</li>
            <li>Reduce manual effort by 80%</li>
            <li>Consistent and scalable question sets</li>

          </ul>

        </motion.div>

      </section>


      {/* STATS SECTION */}
      <section className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 px-10 text-center">

        {[
          { label: "AI Generated Questions", value: "1000+" },
          { label: "Secure Exams", value: "100+" },
          { label: "Active Users", value: "500+" },
          { label: "Accuracy", value: "99%" }
        ].map((item, i) => (

          <div key={i} className="bg-white p-6 rounded-xl shadow">

            <h3 className="text-2xl font-bold text-blue-600">
              {item.value}
            </h3>

            <p className="text-gray-500">
              {item.label}
            </p>

          </div>

        ))}

      </section>


      {/* FEATURES */}
      <section className="mt-28 px-10 pb-20">

        <h2 className="text-4xl font-bold text-center mb-14">
          Platform Features
        </h2>

        <div className="grid md:grid-cols-3 gap-8">

          {features.map((f, index) => (

            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              className="bg-white/80 backdrop-blur p-6 rounded-xl shadow-lg hover:shadow-2xl transition"
            >

              <h3 className="font-semibold text-lg mb-2 text-blue-600">
                {f.title}
              </h3>

              <p className="text-gray-600">
                {f.desc}
              </p>

            </motion.div>

          ))}

        </div>

      </section>


      {/* CTA */}
      <section className="text-center pb-20">

        <h2 className="text-3xl font-bold mb-6">
          Ready to create smarter exams?
        </h2>

        <Link
          to="/register"
          className="bg-purple-600 text-white px-10 py-4 rounded-xl hover:bg-purple-700 transition shadow-lg"
        >
          Start Now
        </Link>

      </section>

    </div>
  );
}