import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import api from "../api/axios";

const TT = ({active,payload,label}) => !active||!payload?.length ? null : (
  <div style={{background:"rgba(255,255,255,0.95)",border:"1px solid #bfdbfe",borderRadius:8,padding:"0.5rem 0.9rem",fontSize:"0.82rem"}}>
    <p style={{color:"#64748b",marginBottom:"0.2rem"}}>{label}</p>
    <p style={{color:"#2563eb",fontWeight:700}}>{payload[0].value}</p>
  </div>
);

export default function AnalyticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api.get(`/exam/results/${id}`).then(r=>setData(Array.isArray(r.data)?r.data:[])).catch(()=>{}).finally(()=>setLoading(false));
  },[id]);

  const scoreData = data.map(d=>({name:d.name?.split(" ")[0]||"?",score:Number(d.score)||0}));
  const passCount = data.filter(d=>Number(d.score)>=(Number(d.total_marks)*0.4)).length;
  const pieData   = [{name:"Pass",value:passCount},{name:"Fail",value:data.length-passCount}];
  const avg       = data.length?(data.reduce((s,d)=>s+Number(d.score),0)/data.length).toFixed(1):0;
  const max       = data.length?Math.max(...data.map(d=>Number(d.score))):0;
  const cheats    = data.reduce((s,d)=>s+(d.cheat_count||0),0);

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div className="spin spin-blue" style={{width:32,height:32}}/></div>;

  return (
    <div className="page">
      <div className="wrap">
        <motion.div initial={{opacity:0,y:-16}} animate={{opacity:1,y:0}}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <h1 style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-0.03em",color:"#0f172a"}}>Analytics</h1>
            <p style={{color:"#64748b",fontSize:"0.85rem",marginTop:"0.2rem"}}>{data.length} student(s)</p>
          </div>
          <button className="btn btn-secondary" onClick={()=>navigate("/dashboard")}>← Dashboard</button>
        </motion.div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:"0.85rem",marginBottom:"1.25rem"}}>
          {[{v:data.length,l:"Students",c:"#3b7ef8"},{v:avg,l:"Avg Score",c:"#059669"},{v:max,l:"Highest",c:"#7c3aed"},{v:cheats,l:"Cheat Events",c:"#dc2626"}].map((s,i)=>(
            <motion.div key={i} className="glass" style={{padding:"1.15rem",textAlign:"center"}}
              initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}}>
              <div style={{fontWeight:800,fontSize:"1.65rem",color:s.c,letterSpacing:"-0.04em"}}>{s.v}</div>
              <div style={{color:"#64748b",fontSize:"0.76rem",marginTop:"0.15rem",fontWeight:500}}>{s.l}</div>
            </motion.div>
          ))}
        </div>

        {data.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"1rem",marginBottom:"1.25rem"}}>
            <div className="glass" style={{padding:"1.4rem"}}>
              <h3 style={{fontWeight:700,fontSize:"0.88rem",marginBottom:"0.9rem",color:"#0f172a"}}>Student Scores</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreData}>
                  <XAxis dataKey="name" tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:"#94a3b8",fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<TT/>}/>
                  <Bar dataKey="score" fill="#3b7ef8" radius={[5,5,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="glass" style={{padding:"1.4rem"}}>
              <h3 style={{fontWeight:700,fontSize:"0.88rem",marginBottom:"0.9rem",color:"#0f172a"}}>Pass vs Fail</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" outerRadius={75} label={({name,value})=>`${name}: ${value}`} labelLine={false}>
                    {pieData.map((_,i)=><Cell key={i} fill={i===0?"#10b981":"#ef4444"}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:"rgba(255,255,255,0.95)",border:"1px solid #bfdbfe",borderRadius:8}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="glass" style={{padding:"1.4rem"}}>
          <h3 style={{fontWeight:700,fontSize:"0.88rem",marginBottom:"0.9rem",color:"#0f172a"}}>Detailed Results</h3>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Name</th><th>Score</th><th>Total</th><th>%</th><th>Status</th><th>Cheats</th></tr></thead>
              <tbody>
                {data.length===0?(
                  <tr><td colSpan={6} style={{textAlign:"center",color:"#94a3b8",padding:"2rem"}}>No results</td></tr>
                ):data.map((d,i)=>{
                  const pct=Math.round((Number(d.score)/Number(d.total_marks))*100)||0;
                  const pass=pct>=40;
                  return (
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{d.name}</td>
                      <td style={{color:"#3b7ef8",fontWeight:700}}>{d.score}</td>
                      <td style={{color:"#64748b"}}>{d.total_marks}</td>
                      <td style={{color:"#64748b"}}>{pct}%</td>
                      <td><span className={`badge ${pass?"badge-green":"badge-red"}`}>{pass?"Pass":"Fail"}</span></td>
                      <td>{d.cheat_count>0?<span className="badge badge-red">⚠️ {d.cheat_count}</span>:<span style={{color:"#94a3b8"}}>—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
