import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function CreateExam() {
  const navigate = useNavigate();
  const [form, setForm] = useState({title:"",duration:30,marks:10,startTime:"",endTime:""});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleCreate = async (e) => {
    e.preventDefault(); if(!form.title.trim()) return setError("Title required");
    setError(""); setLoading(true);
    try {
      const r = await api.post("/exam/create",{
        title:form.title, duration_minutes:Number(form.duration),
        total_marks:Number(form.marks),
        start_time:form.startTime||null, end_time:form.endTime||null,
      });
      navigate(`/exam-builder/${r.data.exam_code}`);
    } catch(err){ setError(err.response?.data?.error||"Failed to create exam"); }
    finally{ setLoading(false); }
  };

  return (
    <div className="page-center">
      <motion.div className="wrap-sm" style={{width:"100%"}}
        initial={{opacity:0,y:28}} animate={{opacity:1,y:0}}>
        <div style={{textAlign:"center",marginBottom:"1.75rem"}}>
          <h1 style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-0.03em",color:"#0f172a"}}>Create Exam</h1>
          <p style={{color:"#64748b",marginTop:"0.3rem",fontSize:"0.88rem"}}>Set up your exam details</p>
        </div>
        <div className="glass-strong" style={{padding:"2rem 2.25rem"}}>
          {error && <div className="err-box" style={{marginBottom:"1rem"}}>⚠️ {error}</div>}
          <form onSubmit={handleCreate} style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            <div>
              <label className="input-label">Exam Title *</label>
              <input className="input" type="text" placeholder="e.g. Physics Chapter 5 Test"
                value={form.title} onChange={set("title")} required/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
              <div>
                <label className="input-label">Duration (min)</label>
                <input className="input" type="number" min="1" value={form.duration} onChange={set("duration")}/>
              </div>
              <div>
                <label className="input-label">Total Marks</label>
                <input className="input" type="number" min="1" value={form.marks} onChange={set("marks")}/>
              </div>
            </div>
            <div>
              <label className="input-label">Start Time (optional)</label>
              <input className="input" type="datetime-local" value={form.startTime} onChange={set("startTime")}/>
            </div>
            <div>
              <label className="input-label">End Time (optional)</label>
              <input className="input" type="datetime-local" value={form.endTime} onChange={set("endTime")}/>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={loading} style={{marginTop:"0.25rem"}}>
              {loading?<><span className="spin"/>Creating...</>:"Create & Add Questions →"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
