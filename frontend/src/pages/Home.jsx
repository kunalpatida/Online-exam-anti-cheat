import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, sans-serif" }}>

      {/* NAVBAR */}
      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 2rem",
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.2rem", color: "#0f172a" }}>
          SmartExam AI
        </h2>

        <div style={{ display: "flex", gap: "1rem" }}>
          <Link to="/login" style={linkStyle}>Login</Link>
          <Link to="/register" style={primaryBtn}>Get Started</Link>
        </div>
      </nav>


      {/* HERO */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        alignItems: "center",
        padding: "5rem 2rem",
        maxWidth: "1100px",
        margin: "0 auto",
        gap: "2rem"
      }}>

        {/* LEFT */}
        <div>
          <h1 style={{
            fontSize: "3rem",
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: "1rem",
            color: "#0f172a"
          }}>
            Run Smarter Exams <br /> Without the Headache
          </h1>

          <p style={{
            color: "#475569",
            fontSize: "1.05rem",
            marginBottom: "2rem",
            maxWidth: "480px"
          }}>
            Create exams in minutes, auto-grade responses, and monitor cheating —
            all from one clean dashboard.
          </p>

          <div style={{ display: "flex", gap: "1rem" }}>
            <Link to="/register" style={primaryBtn}>
              Start Free
            </Link>
            <Link to="/login" style={secondaryBtn}>
              Live Demo
            </Link>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{
          height: "280px",
          borderRadius: "16px",
          background: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontSize: "0.9rem"
        }}>
          Dashboard Preview
        </div>
      </section>


      {/* STATS */}
      <section style={{
        display: "flex",
        justifyContent: "space-around",
        padding: "2rem",
        background: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        borderBottom: "1px solid #e2e8f0",
        flexWrap: "wrap",
        gap: "1rem"
      }}>
        {[
          ["1000+", "Questions Generated"],
          ["500+", "Active Users"],
          ["99%", "Accuracy"],
          ["<1s", "Grading Time"]
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1.5rem", color: "#0f172a" }}>{s[0]}</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>{s[1]}</p>
          </div>
        ))}
      </section>


      {/* FEATURES */}
      <section style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "4rem 2rem"
      }}>
        <h2 style={{
          fontSize: "2rem",
          fontWeight: 700,
          marginBottom: "2rem",
          color: "#0f172a"
        }}>
          Built for Real Exam Workflows
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.5rem"
        }}>
          {[
            ["AI Generation", "Generate full exams instantly with AI"],
            ["Anti-Cheat", "Detect tab switching & suspicious behavior"],
            ["Analytics", "Track student performance in real-time"],
            ["Smart Timer", "Auto-synced exam timing"],
            ["Evaluation", "MCQ + descriptive grading system"],
            ["Responsive", "Works smoothly on all devices"]
          ].map((f, i) => (
            <div key={i} style={{
              padding: "1.5rem",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              background: "#ffffff"
            }}>
              <h3 style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#0f172a" }}>
                {f[0]}
              </h3>
              <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
                {f[1]}
              </p>
            </div>
          ))}
        </div>
      </section>


      {/* CTA */}
      <section style={{
        background: "#0f172a",
        color: "white",
        textAlign: "center",
        padding: "4rem 2rem"
      }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 700 }}>
          Ready to simplify your exams?
        </h2>

        <p style={{ margin: "1rem 0", color: "#cbd5f5" }}>
          Start using SmartExam AI today.
        </p>

        <Link to="/register" style={primaryBtn}>
          Create Free Account
        </Link>
      </section>

    </div>
  );
}


/* STYLES */
const linkStyle = {
  textDecoration: "none",
  color: "#0f172a",
  fontWeight: 500
};

const primaryBtn = {
  textDecoration: "none",
  background: "#3b82f6",
  color: "white",
  padding: "0.6rem 1.2rem",
  borderRadius: "8px",
  fontWeight: 600
};

const secondaryBtn = {
  textDecoration: "none",
  border: "1px solid #cbd5e1",
  padding: "0.6rem 1.2rem",
  borderRadius: "8px",
  color: "#0f172a",
  fontWeight: 500
};
