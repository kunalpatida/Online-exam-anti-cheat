import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function ExamSubmitted() {
  const navigate = useNavigate();
  return (
    <div className="page-center">
      <motion.div className="wrap-sm" style={{width:"100%"}} initial={{opacity:0,scale:0.92}} animate={{opacity:1,scale:1}}>
        <div className="glass-strong" style={{padding:"2.75rem 2rem",textAlign:"center"}}>
          <div style={{fontSize:"3.5rem",marginBottom:"1rem"}}>🎉</div>
          <h1 style={{fontWeight:800,fontSize:"1.7rem",letterSpacing:"-0.03em",marginBottom:"0.65rem",color:"#0f172a"}}>Exam Submitted!</h1>
          <p style={{color:"#64748b",marginBottom:"1.75rem",lineHeight:1.65,fontSize:"0.9rem"}}>
            Your responses have been recorded. Results will be available once evaluated.
          </p>
          <button className="btn btn-primary btn-lg btn-full" onClick={()=>navigate("/dashboard")}>← Back to Dashboard</button>
        </div>
      </motion.div>
    </div>
  );
}
