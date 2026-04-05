import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function ResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [marks, setMarks]     = useState({});
  const [evald, setEvald]     = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const showToast=(msg,type="s")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  useEffect(()=>{
    Promise.all([api.get(`/exam/results/${id}`),api.get(`/exam/answers/${id}`)])
      .then(([r,a])=>{ setResults(Array.isArray(r.data)?r.data:[]); setAnswers(Array.isArray(a.data)?a.data:[]); })
      .catch(()=>showToast("Failed to load","e"))
      .finally(()=>setLoading(false));
  },[id]);

  const evaluate=async(a,isEdit=false)=>{
    const val=Number(marks[a.question_id]);
    if(!val&&val!==0) return showToast("Enter marks","e");
    try{
      const r=await api.post("/exam/evaluate",{user_id:a.user_id,exam_id:id,question_id:a.question_id,marks:val});
      setEvald(p=>({...p,[a.question_id]:true,[`e_${a.question_id}`]:false}));
      showToast(`Saved! Score: ${r.data.current_score}/${r.data.total_marks}`);
    }catch(err){showToast(err.response?.data?.error||"Failed","e");}
  };

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div className="spin spin-blue" style={{width:32,height:32}}/></div>;

  return (
    <div className="page">
      <div className="toast-wrap">{toast&&<div className={`toast toast-${toast.type}`}>{toast.msg}</div>}</div>
      <div className="wrap">
        <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <h1 style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-0.03em",color:"#0f172a"}}>Exam Results</h1>
            <p style={{color:"#64748b",fontSize:"0.85rem",marginTop:"0.2rem"}}>{results.length} student(s)</p>
          </div>
          <button className="btn btn-secondary" onClick={()=>navigate("/dashboard")}>← Dashboard</button>
        </motion.div>

        {results.length===0?(
          <div className="glass" style={{padding:"3rem",textAlign:"center"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}>📊</div>
            <p style={{color:"#64748b"}}>No results yet</p>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:"0.7rem",marginBottom:"1.5rem"}}>
            {results.map((r,i)=>{
              const pct=r.total_marks?Math.round((r.score/r.total_marks)*100):0;
              const pass=pct>=40;
              return (
                <motion.div key={i} className="glass" style={{padding:"1.2rem"}}
                  initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.65rem"}}>
                    <div>
                      <p style={{fontWeight:700,color:"#0f172a"}}>{r.name}</p>
                      <p style={{color:"#64748b",fontSize:"0.8rem"}}>{r.email}</p>
                    </div>
                    <div style={{display:"flex",gap:"0.5rem",alignItems:"center",flexWrap:"wrap"}}>
                      {r.evaluation_status==="PENDING"&&<span className="badge badge-yellow">⏳ Pending</span>}
                      {r.cheat_count>0&&<span className="badge badge-red">⚠️ {r.cheat_count}</span>}
                      <span className={`badge ${pass?"badge-green":"badge-red"}`}>{pass?"✅ Pass":"❌ Fail"}</span>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:800,fontSize:"1.1rem",color:"#3b7ef8"}}>{r.score}/{r.total_marks}</div>
                        <div style={{color:"#64748b",fontSize:"0.76rem"}}>{pct}%</div>
                      </div>
                    </div>
                  </div>
                  <div style={{marginTop:"0.65rem",background:"#e2e8f0",borderRadius:99,height:5}}>
                    <div style={{width:`${pct}%`,height:"100%",borderRadius:99,
                      background:pass?"linear-gradient(90deg,#059669,#10b981)":"linear-gradient(90deg,#dc2626,#ef4444)",
                      transition:"width 1s ease"}}/>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {answers.length>0&&(
          <div className="glass" style={{padding:"1.6rem"}}>
            <h2 style={{fontWeight:700,fontSize:"1rem",marginBottom:"1.1rem",color:"#0f172a"}}>✍️ Descriptive Evaluation</h2>
            {answers.map((a,i)=>{
              const val=marks[a.question_id]??"";
              const isEval=evald[a.question_id];
              const isEdit=evald[`e_${a.question_id}`];
              return (
                <div key={i} style={{marginBottom:"1.4rem",paddingBottom:"1.4rem",borderBottom:"1px solid rgba(59,126,248,0.08)"}}>
                  <p style={{fontWeight:700,marginBottom:"0.25rem",color:"#0f172a"}}>{a.name}</p>
                  <p style={{color:"#64748b",fontSize:"0.85rem",marginBottom:"0.5rem"}}>{a.question_text}</p>
                  <div style={{background:"rgba(255,255,255,0.7)",border:"1px solid rgba(59,126,248,0.1)",
                    borderRadius:"var(--r-sm)",padding:"0.7rem 0.9rem",fontSize:"0.88rem",
                    marginBottom:"0.7rem",lineHeight:1.6,color:"#374151"}}>
                    {a.text_answer||<span style={{color:"#94a3b8"}}>No answer</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"0.6rem",flexWrap:"wrap"}}>
                    <input className="input" type="number" min="0" placeholder="Marks"
                      value={val} disabled={isEval&&!isEdit}
                      onChange={e=>setMarks(m=>({...m,[a.question_id]:e.target.value}))}
                      style={{width:100}}/>
                    {!isEval&&<button className="btn btn-primary btn-sm" disabled={!val} onClick={()=>evaluate(a)}>Submit</button>}
                    {isEval&&!isEdit&&(
                      <button className="btn btn-sm" style={{background:"#fef9c3",color:"#a16207",border:"1px solid #fde68a"}}
                        onClick={()=>setEvald(p=>({...p,[`e_${a.question_id}`]:true}))}>Edit</button>
                    )}
                    {isEdit&&<button className="btn btn-success btn-sm" disabled={!val} onClick={()=>evaluate(a,true)}>Save</button>}
                    {isEval&&!isEdit&&<span className="badge badge-green">✅ Evaluated</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
