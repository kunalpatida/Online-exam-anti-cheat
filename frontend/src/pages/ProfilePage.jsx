import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function ProfilePage() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();
  useEffect(()=>{ api.get("/exam/profile").then(r=>setData(r.data)).catch(()=>navigate("/login")); },[]);
  const logout=()=>{ localStorage.removeItem("token"); navigate("/"); };

  if(!data) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div className="spin spin-blue" style={{width:32,height:32}}/></div>;

  return (
    <div className="page-center">
      <motion.div className="wrap-sm" style={{width:"100%"}} initial={{opacity:0,y:28}} animate={{opacity:1,y:0}}>
        <div className="glass-strong" style={{padding:"2.25rem",textAlign:"center"}}>
          <div style={{width:68,height:68,borderRadius:"50%",background:"linear-gradient(135deg,#3b7ef8,#60a5fa)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.65rem",fontWeight:800,
            margin:"0 auto 1.1rem",boxShadow:"0 8px 28px rgba(59,126,248,0.3)",color:"#fff"}}>
            {data.user.name?.charAt(0).toUpperCase()}
          </div>
          <h2 style={{fontWeight:800,fontSize:"1.35rem",letterSpacing:"-0.02em",color:"#0f172a"}}>{data.user.name}</h2>
          <p style={{color:"#64748b",marginTop:"0.25rem",marginBottom:"1.75rem",fontSize:"0.88rem"}}>{data.user.email}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.85rem",marginBottom:"1.75rem"}}>
            <div className="glass" style={{padding:"1.1rem"}}>
              <div style={{fontWeight:800,fontSize:"1.75rem",color:"#3b7ef8"}}>{data.created}</div>
              <div style={{color:"#64748b",fontSize:"0.76rem",marginTop:"0.15rem"}}>Exams Created</div>
            </div>
            <div className="glass" style={{padding:"1.1rem"}}>
              <div style={{fontWeight:800,fontSize:"1.75rem",color:"#059669"}}>{data.attempted}</div>
              <div style={{color:"#64748b",fontSize:"0.76rem",marginTop:"0.15rem"}}>Exams Attempted</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.65rem"}}>
            <button className="btn btn-secondary btn-full" onClick={()=>navigate("/dashboard")}>← Dashboard</button>
            <button className="btn btn-danger btn-full" onClick={logout}>Logout</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
