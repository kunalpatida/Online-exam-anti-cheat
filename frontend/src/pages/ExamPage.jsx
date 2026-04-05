import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function ExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]     = useState({});
  const [timeLeft, setTimeLeft]   = useState(0);
  const [cheatCount, setCheatCount] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const finished = useRef(false);

  useEffect(()=>{
    api.get(`/exam/questions/${id}`).then(r=>{
      setQuestions(Array.isArray(r.data.questions)?r.data.questions:[]);
      setTimeLeft(r.data.remaining_seconds||0);
      if(r.data.answers){
        const m={};
        r.data.answers.forEach(a=>{ m[a.question_id]=a.selected_option||a.text_answer||""; });
        setAnswers(m);
      }
    }).catch(err=>{
      const msg=err.response?.data?.error||"";
      if(msg==="Exam already completed"){alert("You already completed this exam");navigate("/dashboard");}
      else if(msg.includes("Time over")){alert("Exam time is over");navigate("/dashboard");}
      else{alert(msg||"Failed to load");navigate("/dashboard");}
    }).finally(()=>setLoading(false));
  },[id,navigate]);

  const submit = async (reason="manual") => {
    if(finished.current) return;
    finished.current=true; setSubmitting(true);
    try{ await api.post("/exam/submit",{exam_id:id}); }catch{}
    navigate("/dashboard",{replace:true});
  };

  useEffect(()=>{
    if(loading) return;
    const t=setInterval(()=>setTimeLeft(s=>{ if(s<=1){clearInterval(t);submit("timeout");return 0;} return s-1; }),1000);
    return()=>clearInterval(t);
  },[loading]);

  useEffect(()=>{
    if(loading) return;
    let count=0, last=0;
    const cheat=async()=>{
      if(finished.current) return;
      const now=Date.now(); if(now-last<800) return; last=now;
      count+=1; setCheatCount(count);
      try{await api.post("/exam/log-cheat",{exam_id:id,event_type:"tab_switch"});}catch{}
      if(count>=3) submit("cheat");
    };
    const onVis=()=>{ if(document.hidden) cheat(); };
    const onBlur=()=>cheat();
    document.addEventListener("visibilitychange",onVis);
    window.addEventListener("blur",onBlur);
    return()=>{ document.removeEventListener("visibilitychange",onVis); window.removeEventListener("blur",onBlur); };
  },[loading]);

  useEffect(()=>{
    const onKey=e=>{ if((e.ctrlKey||e.metaKey)&&["c","v","x","a"].includes(e.key.toLowerCase())) e.preventDefault(); };
    const onCtx=e=>e.preventDefault();
    const onSel=e=>e.preventDefault();
    document.addEventListener("keydown",onKey);
    document.addEventListener("contextmenu",onCtx);
    document.addEventListener("selectstart",onSel);
    return()=>{ document.removeEventListener("keydown",onKey); document.removeEventListener("contextmenu",onCtx); document.removeEventListener("selectstart",onSel); };
  },[]);

  const answer=(qid,text)=>{ setAnswers(p=>({...p,[qid]:text})); api.post("/exam/save-answer",{exam_id:id,question_id:qid,selected_option:text}).catch(()=>{}); };
  const answerText=(qid,text)=>{ setAnswers(p=>({...p,[qid]:text})); api.post("/exam/save-answer",{exam_id:id,question_id:qid,text_answer:text}).catch(()=>{}); };

  const mins=Math.floor(timeLeft/60), secs=timeLeft%60;
  const timeColor=timeLeft<60?"#ef4444":timeLeft<300?"#f59e0b":"#059669";
  const answered=Object.values(answers).filter(v=>v).length;

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div className="spin spin-blue" style={{width:32,height:32,marginBottom:"0.9rem"}}/>
        <p style={{color:"#64748b"}}>Loading exam...</p>
      </div>
    </div>
  );

  return (
    <div className="page" style={{userSelect:"none"}}>
      {/* Sticky header */}
      <div style={{position:"sticky",top:0,zIndex:50,
        background:"rgba(238,243,251,0.88)",backdropFilter:"blur(18px)",
        borderBottom:"1px solid rgba(59,126,248,0.1)",
        padding:"0.85rem 1.25rem",marginBottom:"1.25rem",
        display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.65rem",
        marginLeft:"-1.5rem",marginRight:"-1.5rem"}}>
        <div>
          <p style={{fontWeight:700,color:"#0f172a",fontSize:"1rem"}}>Online Examination</p>
          <p style={{color:"#64748b",fontSize:"0.78rem",marginTop:"0.1rem"}}>
            {answered}/{questions.length} answered
            {cheatCount>0&&<span style={{color:"#f59e0b",marginLeft:"0.6rem"}}>⚠️ {cheatCount}/3 warnings</span>}
          </p>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"0.68rem",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>Time Left</div>
          <div style={{fontWeight:800,fontSize:"1.5rem",color:timeColor,letterSpacing:"-0.02em",lineHeight:1}}>
            {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
          </div>
        </div>
      </div>

      <div className="wrap-md" style={{width:"100%"}}>
        {questions.map((q,i)=>{
          const type=(q.question_type||"").toLowerCase();
          return (
            <motion.div key={q.question_id} className="glass" style={{padding:"1.35rem",marginBottom:"1rem"}}
              initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}>
              <p style={{fontWeight:600,marginBottom:"0.9rem",lineHeight:1.6,color:"#0f172a",fontSize:"0.92rem"}}>
                <span className="badge badge-blue" style={{marginRight:"0.5rem"}}>{i+1}</span>
                {q.question_text}
              </p>
              {type==="mcq"&&(
                <div style={{display:"flex",flexDirection:"column",gap:"0.45rem"}}>
                  {["A","B","C","D"].map(opt=>{
                    const text=q[`option_${opt.toLowerCase()}`]; if(!text) return null;
                    const sel=answers[q.question_id]===text;
                    return (
                      <button key={opt} onClick={()=>answer(q.question_id,text)}
                        style={{background:sel?"#dbeafe":"rgba(255,255,255,0.7)",
                          border:sel?"1.5px solid #3b7ef8":"1.5px solid rgba(59,126,248,0.15)",
                          borderRadius:"var(--r-sm)",padding:"0.72rem 1rem",
                          color:sel?"#1d4ed8":"#475569",textAlign:"left",cursor:"pointer",
                          transition:"all 0.14s",fontSize:"0.88rem",fontWeight:sel?600:400}}>
                        <span style={{opacity:0.5,marginRight:"0.5rem",fontWeight:700}}>{opt}.</span>{text}
                      </button>
                    );
                  })}
                </div>
              )}
              {type==="descriptive"&&(
                <textarea className="input" rows={4} placeholder="Write your answer here..."
                  value={answers[q.question_id]||""}
                  onChange={e=>answerText(q.question_id,e.target.value)}
                  style={{userSelect:"text"}}/>
              )}
            </motion.div>
          );
        })}

        <div style={{textAlign:"center",padding:"1.75rem 0"}}>
          <button className="btn btn-success btn-lg" disabled={submitting}
            onClick={()=>{ if(window.confirm(`Submit? ${answered}/${questions.length} answered.`)) submit("manual"); }}>
            {submitting?<><span className="spin"/>Submitting...</>:"✅ Submit Exam"}
          </button>
          <p style={{color:"#94a3b8",fontSize:"0.78rem",marginTop:"0.6rem"}}>
            {questions.length-answered} question(s) unanswered
          </p>
        </div>
      </div>
    </div>
  );
}
