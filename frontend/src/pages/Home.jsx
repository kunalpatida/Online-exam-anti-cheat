import { Link } from "react-router-dom";

const features = [
  { icon: "🤖", title: "AI Question Generation", desc: "Generate full exams instantly with Gemini AI — MCQ & descriptive both." },
  { icon: "🔒", title: "Anti-Cheat System", desc: "Tab switch detection, copy-paste block, auto-submit on violations." },
  { icon: "⚡", title: "Instant Results", desc: "MCQ auto-evaluated. Descriptive manually reviewed by teacher." },
  { icon: "📊", title: "Analytics Dashboard", desc: "Track scores, pass/fail ratio, and cheating activity." },
  { icon: "🎯", title: "Mixed Question Types", desc: "Combine MCQ and descriptive in one exam seamlessly." },
  { icon: "📱", title: "Mobile Friendly", desc: "Take exams on any device — phone, tablet, or desktop." },
];

const stats = [
  { value: "1000+", label: "AI Questions Generated" },
  { value: "99%",   label: "Accuracy" },
  { value: "500+",  label: "Active Users" },
  { value: "100+",  label: "Exams Created" },
];

export default function Home() {
  return (
    <div style={{ position: "relative", zIndex: 1 }}>

      {/* NAV */}
      <nav className="navbar">
        <span className="nav-logo">SmartExam AI</span>
        <div className="flex-gap">
          <Link to="/login" className="btn btn-secondary btn-sm">Login</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ padding: "80px 24px 60px", textAlign: "center", maxWidth: 800, margin: "0 auto" }}>
        <div className="badge badge-purple anim-fade-up" style={{ marginBottom: 20 }}>
          ✨ AI-Powered Exam Platform
        </div>
        <h1 className="anim-fade-up anim-delay-1" style={{ marginBottom: 20 }}>
          Create Smarter Exams with{" "}
          <span className="gradient-text">Artificial Intelligence</span>
        </h1>
        <p className="anim-fade-up anim-delay-2" style={{ color: "var(--text-secondary)", fontSize: 18, marginBottom: 36, lineHeight: 1.7 }}>
          Build, share, and evaluate exams in minutes. AI generates questions,
          anti-cheat system monitors students, results are instant.
        </p>
        <div className="flex-gap flex-center anim-fade-up anim-delay-3">
          <Link to="/register" className="btn btn-primary btn-lg">Start for Free</Link>
          <Link to="/login" className="btn btn-secondary btn-lg">Sign In</Link>
        </div>
      </section>

      {/* STATS */}
      <section style={{ padding: "0 24px 60px" }}>
        <div className="container">
          <div className="grid-4 anim-fade-up anim-delay-2">
            {stats.map((s, i) => (
              <div key={i} className="glass stat-card">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "20px 24px 80px" }}>
        <div className="container">
          <h2 style={{ textAlign: "center", marginBottom: 12 }}>Everything You Need</h2>
          <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 40 }}>
            A complete exam management platform
          </p>
          <div className="grid-3">
            {features.map((f, i) => (
              <div key={i} className={`glass anim-fade-up anim-delay-${(i%4)+1}`}
                style={{ padding: "28px 24px" }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ marginBottom: 8, fontSize: "1rem" }}>{f.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 24px 80px", textAlign: "center" }}>
        <div className="glass-strong" style={{ maxWidth: 600, margin: "0 auto", padding: "48px 36px" }}>
          <h2 style={{ marginBottom: 12 }}>Ready to get started?</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 28 }}>
            Join educators who are already using SmartExam AI
          </p>
          <Link to="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
        </div>
      </section>

    </div>
  );
}
