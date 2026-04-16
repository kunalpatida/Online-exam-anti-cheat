import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  { icon:"⚡", title:"AI Question Generation", desc:"Generate full exams in seconds with Gemini AI — any topic, any difficulty." },
  { icon:"🛡️", title:"Anti-Cheat System",      desc:"Tab-switch detection, copy-paste block, auto-submit on violations." },
  { icon:"📊", title:"Live Analytics",          desc:"Real-time scores, pass/fail charts, and cheating activity logs." },
  { icon:"⏱️", title:"Smart Timer",             desc:"Server-synced countdown — refresh-proof, session always persists." },
  { icon:"✍️", title:"MCQ + Descriptive",       desc:"Auto-grade MCQs. Manual evaluation panel for written answers." },
  { icon:"📱", title:"Mobile Ready",            desc:"Fully responsive — works perfectly on phones, tablets, desktops." },
];

export default function Home() {
  return (
    <div style={{minHeight:"100vh",overflowX:"hidden"}}>

      {/* Navbar */}
      <motion.nav initial={{y:-20,opacity:0}} animate={{y:0,opacity:1}}
        style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"0.9rem 1.5rem",background:"rgba(255,255,255,0.75)",
          backdropFilter:"blur(18px)",borderBottom:"1px solid rgba(59,126,248,0.1)",
          position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#3b7ef8,#60a5fa)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,
            boxShadow:"0 4px 12px rgba(59,126,248,0.3)"}}>🎓</div>
          <span style={{fontWeight:800,fontSize:"1.05rem",color:"#0f172a",letterSpacing:"-0.03em"}}>
            SmartExam <span style={{color:"#3b7ef8"}}>AI</span>
          </span>
        </div>
        <div style={{display:"flex",gap:"0.5rem"}}>
          <Link to="/login"    className="btn btn-secondary btn-sm">Login</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <section style={{textAlign:"center",padding:"5rem 1.25rem 3.5rem",maxWidth:760,margin:"0 auto"}}>
        <motion.div initial={{opacity:0,y:32}} animate={{opacity:1,y:0}} transition={{duration:0.5}}>
          <span className="badge badge-blue" style={{marginBottom:"1.25rem",display:"inline-flex",fontSize:"0.78rem"}}>
            ✨ Powered by Gemini AI
          </span>
          <h1 style={{fontWeight:800,letterSpacing:"-0.04em",lineHeight:1.1,
            fontSize:"clamp(2.1rem,6vw,3.8rem)",color:"#0f172a",marginBottom:"1.25rem"}}>
            The Smartest Way to<br/>
            <span style={{background:"linear-gradient(135deg,#3b7ef8,#60a5fa)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              Run Online Exams
            </span>
          </h1>
          <p style={{color:"#475569",fontSize:"clamp(0.95rem,2.5vw,1.05rem)",lineHeight:1.75,
            maxWidth:500,margin:"0 auto 2.25rem"}}>
            Create AI-powered exams in minutes. Auto-grade, detect cheating, and get deep analytics — all in one clean platform.
          </p>
          <div style={{display:"flex",gap:"0.65rem",justifyContent:"center",flexWrap:"wrap"}}>
            <Link to="/register" className="btn btn-primary btn-lg">Start for Free →</Link>
            <Link to="/login"    className="btn btn-secondary btn-lg">Sign In</Link>
          </div>
        </motion.div>

      </section>

      {/* Stats */}
      <section style={{padding:"1rem 1.25rem 3rem",maxWidth:820,margin:"0 auto"}}>
        <motion.div initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
          style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"0.9rem"}}>
          {[{v:"1000+",l:"AI Questions"},{v:"500+",l:"Active Users"},{v:"99%",l:"Accuracy"},{v:"< 1s",l:"Grading Speed"}].map((s,i)=>(
            <div key={i} className="glass" style={{padding:"1.25rem",textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:"1.75rem",color:"#3b7ef8",letterSpacing:"-0.04em"}}>{s.v}</div>
              <div style={{color:"#64748b",fontSize:"0.78rem",marginTop:"0.18rem",fontWeight:500}}>{s.l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section style={{padding:"2.5rem 1.25rem 4rem",maxWidth:940,margin:"0 auto"}}>
        <motion.div initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}}
          style={{textAlign:"center",marginBottom:"2.5rem"}}>
          <h2 style={{fontWeight:800,fontSize:"clamp(1.5rem,4vw,2rem)",letterSpacing:"-0.03em",color:"#0f172a"}}>
            Everything you need
          </h2>
          <p style={{color:"#64748b",marginTop:"0.5rem",fontSize:"0.9rem"}}>One platform. Every feature. Zero compromise.</p>
        </motion.div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"1rem"}}>
          {features.map((f,i)=>(
            <motion.div key={i} className="glass"
              initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.06}}
              whileHover={{y:-4,boxShadow:"0 12px 36px rgba(59,126,248,0.16)"}}
              style={{padding:"1.5rem",transition:"all 0.22s"}}>
              <div style={{width:40,height:40,borderRadius:10,
                background:"linear-gradient(135deg,rgba(59,126,248,0.1),rgba(96,165,250,0.07))",
                border:"1px solid rgba(59,126,248,0.14)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.25rem",marginBottom:"0.9rem"}}>
                {f.icon}
              </div>
              <h3 style={{fontWeight:700,fontSize:"0.92rem",marginBottom:"0.4rem",color:"#0f172a"}}>{f.title}</h3>
              <p style={{color:"#64748b",fontSize:"0.83rem",lineHeight:1.65}}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:"1.5rem 1.25rem 5rem",maxWidth:580,margin:"0 auto",textAlign:"center"}}>
        <motion.div className="glass-strong" style={{padding:"2.75rem 2rem"}}
          initial={{opacity:0,scale:0.96}} whileInView={{opacity:1,scale:1}} viewport={{once:true}}>
          <div style={{fontSize:"2.25rem",marginBottom:"0.9rem"}}>🚀</div>
          <h2 style={{fontWeight:800,fontSize:"clamp(1.35rem,4vw,1.75rem)",letterSpacing:"-0.03em",marginBottom:"0.65rem",color:"#0f172a"}}>
            Ready to transform your exams?
          </h2>
          <p style={{color:"#64748b",marginBottom:"1.6rem",fontSize:"0.9rem"}}>
            Join hundreds of educators using SmartExam AI today.
          </p>
          <Link to="/register" className="btn btn-primary btn-lg btn-full"
            style={{maxWidth:260,margin:"0 auto",display:"flex"}}>
            Create Free Account →
          </Link>
        </motion.div>
      </section>

    </div>
  );
}
