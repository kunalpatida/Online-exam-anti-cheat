import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  { icon: "⚡", title: "AI Question Generation", desc: "Generate full exams instantly with Gemini AI — MCQs, descriptive, any topic, any difficulty." },
  { icon: "🛡️", title: "Anti-Cheat System",      desc: "Tab-switch detection, copy-paste block, auto-submit on repeated violations." },
  { icon: "📊", title: "Live Analytics",          desc: "Real-time score tracking, pass/fail charts, cheating activity logs per student." },
  { icon: "⏱️", title: "Smart Timer",             desc: "Server-synced countdown — refresh-proof session persists always." },
  { icon: "✍️", title: "MCQ + Descriptive",       desc: "Auto-grade MCQs instantly. Manual evaluation panel for written answers." },
  { icon: "📱", title: "Mobile Ready",            desc: "Fully responsive — works perfectly on phones, tablets, and desktops." },
];

const stats = [
  { value: "1000+", label: "AI Questions" },
  { value: "500+",  label: "Active Users" },
  { value: "99%",   label: "Accuracy" },
  { value: "< 1s",  label: "Grading Speed" },
];

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "1rem 2rem",
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(59,126,248,0.1)",
          position: "sticky", top: 0, zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg,#3b7ef8,#60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 4px 14px rgba(59,126,248,0.35)",
          }}>🎓</div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", letterSpacing: "-0.03em" }}>
            SmartExam <span style={{ color: "#3b7ef8" }}>AI</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <Link to="/login"    className="btn btn-secondary btn-sm">Login</Link>
          <Link to="/register" className="btn btn-primary  btn-sm">Get Started</Link>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section style={{ textAlign: "center", padding: "5.5rem 1.5rem 4rem", maxWidth: 780, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <span className="badge badge-blue" style={{ marginBottom: "1.4rem", display: "inline-flex", fontSize: "0.8rem" }}>
            ✨ Powered by Gemini AI
          </span>

          <h1 style={{
            fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.1,
            fontSize: "clamp(2.4rem, 6.5vw, 4.2rem)",
            color: "#0f172a",
            marginBottom: "1.4rem",
          }}>
            The Smartest Way to<br />
            <span style={{
              background: "linear-gradient(135deg, #3b7ef8 20%, #60a5fa 80%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Run Online Exams</span>
          </h1>

          <p style={{ color: "#475569", fontSize: "1.05rem", lineHeight: 1.75, maxWidth: 520, margin: "0 auto 2.5rem" }}>
            Create AI-powered exams in minutes. Auto-grade, detect cheating, and get deep analytics — all in one clean platform.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/register" className="btn btn-primary btn-lg">Start for Free →</Link>
            <Link to="/login"    className="btn btn-secondary btn-lg">Sign In</Link>
          </div>
        </motion.div>

        {/* Hero card illustration */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="glass"
          style={{ marginTop: "3.5rem", padding: "1.75rem", textAlign: "left", maxWidth: 580, margin: "3.5rem auto 0" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>📋 Physics — Chapter 5 Test</span>
            <span className="badge badge-green">Live</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {["Newton's First Law states that...", "The SI unit of force is...", "Which of the following is a vector quantity?"].map((q, i) => (
              <div key={i} style={{
                background: i === 1 ? "rgba(59,126,248,0.08)" : "rgba(255,255,255,0.6)",
                border: i === 1 ? "1.5px solid rgba(59,126,248,0.25)" : "1px solid rgba(59,126,248,0.1)",
                borderRadius: 8, padding: "0.65rem 1rem",
                fontSize: "0.83rem", color: i === 1 ? "#2563eb" : "#475569",
                fontWeight: i === 1 ? 600 : 400,
              }}>
                Q{i + 1}. {q}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>⏱ 28:42 remaining</span>
            <span style={{ fontSize: "0.8rem", color: "#3b7ef8", fontWeight: 600 }}>3 / 10 answered</span>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: "1rem 1.5rem 3rem", maxWidth: 860, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "1rem" }}
        >
          {stats.map((s, i) => (
            <div key={i} className="glass" style={{ padding: "1.4rem", textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: "1.9rem", color: "#3b7ef8", letterSpacing: "-0.04em" }}>{s.value}</div>
              <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.2rem", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "3rem 1.5rem 4rem", maxWidth: 980, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: "2.75rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.2rem)", letterSpacing: "-0.03em", color: "#0f172a" }}>
            Everything you need
          </h2>
          <p style={{ color: "#64748b", marginTop: "0.6rem", fontSize: "0.95rem" }}>
            One platform. Every feature. Zero compromise.
          </p>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px,1fr))", gap: "1.1rem" }}>
          {features.map((f, i) => (
            <motion.div key={i} className="glass"
              initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(59,126,248,0.18)" }}
              style={{ padding: "1.6rem", cursor: "default", transition: "all 0.25s" }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: "linear-gradient(135deg,rgba(59,126,248,0.12),rgba(96,165,250,0.08))",
                border: "1px solid rgba(59,126,248,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.3rem", marginBottom: "1rem",
              }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.45rem", color: "#0f172a" }}>{f.title}</h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.65 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "2rem 1.5rem 5rem", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <motion.div className="glass-strong" style={{ padding: "3rem 2rem" }}
          initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🚀</div>
          <h2 style={{ fontWeight: 800, fontSize: "clamp(1.4rem,4vw,1.9rem)", letterSpacing: "-0.03em", marginBottom: "0.75rem", color: "#0f172a" }}>
            Ready to transform your exams?
          </h2>
          <p style={{ color: "#64748b", marginBottom: "1.75rem", fontSize: "0.92rem" }}>
            Join hundreds of educators using SmartExam AI today.
          </p>
          <Link to="/register" className="btn btn-primary btn-lg btn-full" style={{ maxWidth: 280, margin: "0 auto" }}>
            Create Free Account →
          </Link>
        </motion.div>
      </section>

    </div>
  );
}
