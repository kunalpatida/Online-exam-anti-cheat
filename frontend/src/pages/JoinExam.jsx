import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function JoinExam() {
  const navigate = useNavigate();
  const [code, setCode]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const handleJoin = async e => {
    e.preventDefault(); if(!code.trim()) return setError("Enter exam code");
    setError(""); setLoading(true);
    try{ const r=await api.post("/exam/join",{exam_code:code.trim().toUpperCase()}); navigate(`/exam/${r.data.exam.exam_id}`); }
    catch(err){ setError(err.response?.data?.error||"Invalid code"); }
    finally{ setLoading(false); }
  };

  return (
    <div className="page-center">
      <motion.div className="wrap-sm" style={{width:"100%"}} initial={{opacity:0,y:28}} animate={{opacity:1,y:0}}>
        <div style={{textAlign:"center",marginBottom:"1.75rem"}}>
          <h1 style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-0.03em",color:"#0f172a"}}>Join Exam</h1>
          <p style={{color:"#64748b",marginTop:"0.3rem",fontSize:"0.88rem"}}>Enter your exam code to begin</p>
        </div>
        <div className="glass-strong" style={{padding:"2rem 2.25rem"}}>
          {error&&<div className="err-box" style={{marginBottom:"1rem"}}>⚠️ {error}</div>}
          <form onSubmit={handleJoin} style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            <div>
              <label className="input-label">Exam Code</label>
              <input className="input" placeholder="e.g. AB1234" value={code}
                onChange={e=>setCode(e.target.value.toUpperCase())} required
                style={{fontFamily:"monospace",fontSize:"1.15rem",letterSpacing:"0.1em",textAlign:"center"}}/>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading?<><span className="spin"/>Joining...</>:"Join Exam →"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
