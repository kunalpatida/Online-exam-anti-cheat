import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios";

const DRAFT = code => `draft_${code}`;
const emptyQ = () => ({question_text:"",question_type:"MCQ",option_a:"",option_b:"",option_c:"",option_d:"",correct_option:"A"});

export default function ExamBuilder() {
  const { code } = useParams();
  const [examId, setExamId]           = useState(null);
  const [questions, setQuestions]     = useState([emptyQ()]);
  const [preview, setPreview]         = useState(false);
  const [modal, setModal]             = useState(false);
  const [modalType, setModalType]     = useState("");
  const [curIdx, setCurIdx]           = useState(null);
  const [topic, setTopic]             = useState("");
  const [subject, setSubject]         = useState("");
  const [diff, setDiff]               = useState("easy");
  const [cnt, setCnt]                 = useState(5);
  const [generating, setGenerating]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [optIdx, setOptIdx]           = useState(null);
  const [toast, setToast]             = useState(null);
  const [draftSaved, setDraftSaved]   = useState(false);

  const showToast = (msg,type="s") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };

  // Restore draft
  useEffect(()=>{
    try {
      const d = localStorage.getItem(DRAFT(code));
      if(d){ const p=JSON.parse(d); if(p.questions?.length>0){ setQuestions(p.questions); showToast("Draft restored 📝","i"); } }
    } catch{}
  },[code]);

  // Auto-save draft
  useEffect(()=>{
    if(!questions.length) return;
    localStorage.setItem(DRAFT(code),JSON.stringify({questions,ts:Date.now()}));
    setDraftSaved(true);
    const t=setTimeout(()=>setDraftSaved(false),1400);
    return()=>clearTimeout(t);
  },[questions,code]);

  useEffect(()=>{
    api.post("/exam/join",{exam_code:code})
      .then(r=>setExamId(r.data.exam.exam_id))
      .catch(()=>showToast("Could not load exam","e"));
  },[code]);

  const change = useCallback((i,f,v)=>setQuestions(qs=>{const u=[...qs];u[i]={...u[i],[f]:v};return u;}),[]);
  const addQ   = () => setQuestions(qs=>[...qs,emptyQ()]);
  const removeQ= i  => { if(questions.length===1) return showToast("At least 1 question needed","e"); setQuestions(qs=>qs.filter((_,x)=>x!==i)); };

  const saveAll = async () => {
    if(!examId) return showToast("Exam not loaded","e");
    if(questions.some(q=>!q.question_text.trim())) return showToast("Some questions are empty","e");
    setSaving(true);
    try {
      for(const q of questions) await api.post("/exam/add-question",{exam_id:examId,...q,option_a:q.option_a||null,option_b:q.option_b||null,option_c:q.option_c||null,option_d:q.option_d||null});
      showToast(`${questions.length} question(s) saved ✅`);
      localStorage.removeItem(DRAFT(code));
      setQuestions([emptyQ()]);
    } catch(err){ showToast(err.response?.data?.error||"Save failed","e"); }
    finally{ setSaving(false); }
  };

  const genOptions = async i => {
    const q=questions[i];
    if(!q.question_text||!q.option_a) return showToast("Enter question and correct answer first","e");
    setOptIdx(i);
    try {
      const r=await api.post("/exam/ai-generate-options",{question:q.question_text,correct_answer:q.option_a});
      const w=r.data.wrong_options;
      change(i,"option_b",w[0]||""); change(i,"option_c",w[1]||""); change(i,"option_d",w[2]||"");
      showToast("AI options generated ✨");
    } catch{ showToast("AI options failed","e"); }
    finally{ setOptIdx(null); }
  };

  const openQModal = i => { setModalType("question"); setCurIdx(i); setTopic(""); setModal(true); };
  const openEModal = () => { setModalType("exam"); setTopic(""); setSubject(""); setModal(true); };

  const generate = async () => {
    if(!topic.trim()) return showToast("Enter a topic","e");
    if(modalType==="exam"&&!subject.trim()) return showToast("Enter a subject","e");
    setGenerating(true);
    try {
      if(modalType==="question"){
        const r=await api.post("/exam/ai-generate-question",{topic});
        const d=r.data;
        setQuestions(qs=>{const u=[...qs];u[curIdx]={...u[curIdx],question_text:d.question,
          option_a:d.options[0]?.replace(/^A:\s*/i,"").trim()||"",
          option_b:d.options[1]?.replace(/^B:\s*/i,"").trim()||"",
          option_c:d.options[2]?.replace(/^C:\s*/i,"").trim()||"",
          option_d:d.options[3]?.replace(/^D:\s*/i,"").trim()||"",
          correct_option:d.correct||"A"};return u;});
        showToast("Question generated ✨");
      } else {
        const r=await api.post("/exam/ai-generate-full-exam",{subject,topic,difficulty:diff,count:Number(cnt)});
        const gen=r.data.questions;
        if(!gen?.length) return showToast("No questions returned","e");
        setQuestions(gen.map(q=>({question_text:q.question_text,question_type:"MCQ",
          option_a:q.options[0]?.replace(/^A:\s*/i,"").trim()||"",
          option_b:q.options[1]?.replace(/^B:\s*/i,"").trim()||"",
          option_c:q.options[2]?.replace(/^C:\s*/i,"").trim()||"",
          option_d:q.options[3]?.replace(/^D:\s*/i,"").trim()||"",
          correct_option:q.correct||"A"})));
        setPreview(true); showToast(`${gen.length} questions generated ✨`);
      }
      setModal(false);
    } catch(err){ showToast(err.response?.data?.error||"Generation failed. Retry.","e"); }
    finally{ setGenerating(false); }
  };

  return (
    <div className="page">
      <div className="toast-wrap">
        {toast&&<div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
      </div>
      <div className="wrap-md" style={{width:"100%"}}>
        {/* Header */}
        <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <h1 style={{fontWeight:800,fontSize:"1.4rem",letterSpacing:"-0.03em",color:"#0f172a"}}>Exam Builder</h1>
            <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginTop:"0.25rem",flexWrap:"wrap"}}>
              <span style={{fontFamily:"monospace",background:"#dbeafe",border:"1px solid #bfdbfe",
                borderRadius:6,padding:"0.18rem 0.55rem",fontSize:"0.82rem",color:"#2563eb",fontWeight:600}}>
                {code}
              </span>
              {draftSaved&&<span style={{color:"#94a3b8",fontSize:"0.72rem"}}>✓ Draft saved</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
            <button className="btn btn-sm" onClick={openEModal}
              style={{background:"#dbeafe",color:"#2563eb",border:"1px solid #bfdbfe"}}>
              ✨ AI Full Exam
            </button>
            <button className="btn btn-secondary btn-sm" onClick={()=>setPreview(p=>!p)}>
              {preview?"Hide Preview":"Preview"}
            </button>
          </div>
        </motion.div>

        {/* Questions */}
        <AnimatePresence>
          {questions.map((q,i)=>(
            <motion.div key={i} className="glass" style={{padding:"1.4rem",marginBottom:"1rem"}}
              initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.97}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.85rem"}}>
                <span className="badge badge-blue">Q{i+1}</span>
                {questions.length>1&&(
                  <button className="btn btn-sm" style={{background:"#fee2e2",color:"#b91c1c",border:"1px solid #fecaca"}}
                    onClick={()=>removeQ(i)}>✕ Remove</button>
                )}
              </div>
              <textarea className="input" placeholder="Enter question text..." value={q.question_text}
                onChange={e=>change(i,"question_text",e.target.value)} rows={2} style={{marginBottom:"0.65rem"}}/>
              <select className="input" value={q.question_type}
                onChange={e=>change(i,"question_type",e.target.value)} style={{marginBottom:"0.65rem"}}>
                <option value="MCQ">MCQ (Multiple Choice)</option>
                <option value="DESCRIPTIVE">Descriptive (Written)</option>
              </select>
              {q.question_type==="MCQ"&&(<>
                <input className="input" placeholder="✅ Correct Answer (Option A)" value={q.option_a}
                  onChange={e=>change(i,"option_a",e.target.value)}
                  style={{marginBottom:"0.55rem",borderColor:"rgba(16,185,129,0.4)",background:"rgba(220,252,231,0.3)"}}/>
                <div style={{display:"flex",gap:"0.45rem",marginBottom:"0.55rem",flexWrap:"wrap"}}>
                  <button className="btn btn-sm" onClick={()=>openQModal(i)}
                    style={{background:"#ede9fe",color:"#6d28d9",border:"1px solid #ddd6fe"}}>
                    🤖 AI Full Question
                  </button>
                  <button className="btn btn-sm" disabled={optIdx===i} onClick={()=>genOptions(i)}
                    style={{background:"#dbeafe",color:"#2563eb",border:"1px solid #bfdbfe"}}>
                    {optIdx===i?<><span className="spin spin-blue" style={{width:12,height:12}}/>Generating...</>:"✨ AI Options"}
                  </button>
                </div>
                {["b","c","d"].map(o=>(
                  <input key={o} className="input" placeholder={`Option ${o.toUpperCase()}`}
                    value={q[`option_${o}`]} onChange={e=>change(i,`option_${o}`,e.target.value)}
                    style={{marginBottom:"0.5rem"}}/>
                ))}
              </>)}
            </motion.div>
          ))}
        </AnimatePresence>

        <div style={{display:"flex",gap:"0.65rem",flexWrap:"wrap",marginTop:"0.25rem"}}>
          <button className="btn btn-secondary" onClick={addQ}>+ Add Question</button>
          <button className="btn btn-success" onClick={saveAll} disabled={saving}>
            {saving?<><span className="spin"/>Saving...</>:"💾 Save All Questions"}
          </button>
        </div>

        <AnimatePresence>
          {preview&&(
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              style={{marginTop:"1.75rem"}}>
              <h2 style={{fontWeight:700,fontSize:"1rem",marginBottom:"0.85rem",color:"#0f172a"}}>Preview</h2>
              {questions.map((q,i)=>(
                <div key={i} className="glass" style={{padding:"1.1rem",marginBottom:"0.65rem"}}>
                  <p style={{fontWeight:600,fontSize:"0.9rem",marginBottom:q.question_type==="MCQ"?"0.65rem":0,color:"#0f172a"}}>
                    {i+1}. {q.question_text||<span style={{color:"#94a3b8"}}>Empty</span>}
                  </p>
                  {q.question_type==="MCQ"&&(
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
                      {["a","b","c","d"].map(o=>q[`option_${o}`]&&(
                        <span key={o} style={{fontSize:"0.8rem",padding:"0.35rem 0.65rem",borderRadius:7,
                          background:o==="a"?"#dcfce7":"#f8fafc",
                          color:o==="a"?"#15803d":"#475569",
                          border:o==="a"?"1px solid #bbf7d0":"1px solid #e2e8f0"}}>
                          {o.toUpperCase()}. {q[`option_${o}`]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.45)",
              display:"flex",justifyContent:"center",alignItems:"center",zIndex:50,padding:"1rem"}}>
            <motion.div initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}
              className="glass-strong" style={{width:"100%",maxWidth:440,padding:"1.75rem"}}>
              <h2 style={{fontWeight:700,fontSize:"1.05rem",marginBottom:"1.25rem",color:"#0f172a"}}>
                {modalType==="question"?"🤖 Generate Question":"✨ Generate Full Exam"}
              </h2>
              <div style={{display:"flex",flexDirection:"column",gap:"0.9rem"}}>
                <div>
                  <label className="input-label">Topic *</label>
                  <input className="input" placeholder="e.g. Newton's Laws" value={topic} onChange={e=>setTopic(e.target.value)}/>
                </div>
                {modalType==="exam"&&(<>
                  <div>
                    <label className="input-label">Subject *</label>
                    <input className="input" placeholder="e.g. Physics" value={subject} onChange={e=>setSubject(e.target.value)}/>
                  </div>
                  <div>
                    <label className="input-label">Difficulty</label>
                    <select className="input" value={diff} onChange={e=>setDiff(e.target.value)}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Number of Questions</label>
                    <input className="input" type="number" min="1" max="20" value={cnt} onChange={e=>setCnt(e.target.value)}/>
                  </div>
                </>)}
              </div>
              {generating&&<p style={{textAlign:"center",color:"#94a3b8",fontSize:"0.78rem",marginTop:"0.9rem"}}>
                🤖 AI is generating... may take 5–15 seconds
              </p>}
              <div style={{display:"flex",justifyContent:"flex-end",gap:"0.6rem",marginTop:"1.4rem"}}>
                <button className="btn btn-secondary btn-sm" disabled={generating} onClick={()=>setModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" disabled={generating} onClick={generate} style={{minWidth:110}}>
                  {generating?<><span className="spin"/>Generating...</>:"✨ Generate"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
