import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function Dashboard() {
  const navigate = useNavigate();
  const [examCode, setExamCode] = useState("");
  const [exams, setExams]       = useState([]);
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState(false);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type="s") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(()=>{
    Promise.all([api.get("/exam/profile"), api.get("/exam/list")])
      .then(([p,e])=>{ setUser(p.data.user); setExams(Array.isArray(e.data)?e.data:[]); })
      .catch(()=>showToast("Failed to load","e"))
      .finally(()=>setLoading(false));
  },[]);

  const handleJoin = async () => {
    if(!examCode.trim()) return showToast("Enter exam code","e");
    setJoining(true);
    try {
      const r = await api.post("/exam/join",{exam_code:examCode.trim().toUpperCase()});
      navigate(`/exam/${r.data.exam.exam_id}`);
    } catch(err){ showToast(err.response?.data?.error||"Invalid code","e"); }
    finally { setJoining(false); }
  };

  const copyCode = code => { navigator.clipboard.writeText(code); showToast("Copied: "+code); };

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div className="spin spin-blue" style={{width:32,height:32,marginBottom:"0.9rem"}}/>
        <p style={{color:"#64748b",fontSize:"0.9rem"}}>Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="page">
      {/* Toast */}
      <div className="toast-wrap">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      </div>

      <div className="wrap">
        {/* Header */}
        <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginBottom:"1.75rem",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <h1 style={{fontWeight:800,fontSize:"clamp(1.4rem,4vw,1.9rem)",letterSpacing:"-0.03em",color:"#0f172a"}}>
              Dashboard
            </h1>
            <p style={{color:"#64748b",marginTop:"0.2rem",fontSize:"0.88rem"}}>
              Welcome back, {user?.name||"User"} 👋
            </p>
          </div>
          <Link to="/profile" style={{textDecoration:"none"}}>
            <motion.div whileHover={{scale:1.08}}
              style={{width:42,height:42,borderRadius:"50%",
                background:"linear-gradient(135deg,#3b7ef8,#60a5fa)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:800,fontSize:"1rem",color:"#fff",cursor:"pointer",
                boxShadow:"0 4px 16px rgba(59,126,248,0.32)"}}>
              {user?.name?.charAt(0).toUpperCase()||"U"}
            </motion.div>
          </Link>
        </motion.div>

        {/* Action Cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"1rem",marginBottom:"1.5rem"}}>
          <motion.div className="glass" style={{padding:"1.6rem"}}
            initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.08}}>
            <h2 style={{fontWeight:700,fontSize:"0.95rem",marginBottom:"0.9rem",color:"#0f172a"}}>🚀 Join Exam</h2>
            <input className="input" placeholder="Enter exam code..." value={examCode}
              onChange={e=>setExamCode(e.target.value.toUpperCase())}
              onKeyDown={e=>e.key==="Enter"&&handleJoin()}
              style={{marginBottom:"0.65rem"}}/>
            <button className="btn btn-primary btn-full" onClick={handleJoin} disabled={joining}>
              {joining?<><span className="spin"/>Joining...</>:"Join Now →"}
            </button>
          </motion.div>

          <motion.div className="glass" style={{padding:"1.6rem"}}
            initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.13}}>
            <h2 style={{fontWeight:700,fontSize:"0.95rem",marginBottom:"0.45rem",color:"#0f172a"}}>✨ Create Exam</h2>
            <p style={{color:"#64748b",fontSize:"0.83rem",marginBottom:"1.1rem",lineHeight:1.55}}>
              Build a new exam and share the code with your students.
            </p>
            <button className="btn btn-success btn-full" onClick={()=>navigate("/create-exam")}>
              + Create New Exam
            </button>
          </motion.div>
        </div>

        {/* Exams Table */}
        <motion.div className="glass" style={{padding:"1.6rem"}}
          initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.18}}>
          <h2 style={{fontWeight:700,fontSize:"0.95rem",marginBottom:"1.1rem",color:"#0f172a"}}>📋 My Exams</h2>

          {exams.length===0 ? (
            <div style={{textAlign:"center",padding:"2.5rem 1rem",color:"#94a3b8"}}>
              <div style={{fontSize:"2.25rem",marginBottom:"0.6rem"}}>📝</div>
              <p style={{fontSize:"0.88rem"}}>No exams yet. Create your first one!</p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th className="hide-m">Duration</th>
                    <th className="hide-m">Marks</th>
                    <th>Code</th>
                    <th className="hide-m">Attempts</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map(ex=>(
                    <tr key={ex.exam_id}>
                      <td style={{fontWeight:600}}>{ex.title}</td>
                      <td className="hide-m" style={{color:"#64748b"}}>{ex.duration_minutes}m</td>
                      <td className="hide-m" style={{color:"#64748b"}}>{ex.total_marks}</td>
                      <td><span style={{fontFamily:"monospace",color:"#3b7ef8",fontWeight:600,fontSize:"0.88rem"}}>{ex.exam_code}</span></td>
                      <td className="hide-m"><span className="badge badge-blue">{ex.attempts||0}</span></td>
                      <td>
                        <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                          <button className="btn btn-secondary btn-sm" onClick={()=>copyCode(ex.exam_code)}>Copy</button>
                          <Link to={`/results/${ex.exam_id}`} className="btn btn-sm"
                            style={{background:"#dcfce7",color:"#15803d",border:"1px solid #bbf7d0",borderRadius:"var(--r-sm)",
                              textDecoration:"none",padding:"0.4rem 0.85rem",fontSize:"0.78rem",display:"inline-flex",alignItems:"center"}}>
                            Results
                          </Link>
                          <Link to={`/analytics/${ex.exam_id}`} className="btn btn-sm"
                            style={{background:"#ede9fe",color:"#6d28d9",border:"1px solid #ddd6fe",borderRadius:"var(--r-sm)",
                              textDecoration:"none",padding:"0.4rem 0.85rem",fontSize:"0.78rem",display:"inline-flex",alignItems:"center"}}>
                            Analytics
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
