import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({name:"",email:"",organization:"",password:""});
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const handleRegister = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally { setLoading(false); }
  };

  const fields = [
    {k:"name",         l:"Full Name",              t:"text",     p:"John Doe"},
    {k:"email",        l:"Email",                  t:"email",    p:"you@example.com"},
    {k:"organization", l:"College / Organization", t:"text",     p:"MIT University"},
    {k:"password",     l:"Password",               t:"password", p:"••••••••"},
  ];

  return (
    <div className="page-center">
      <motion.div className="wrap-sm" style={{width:"100%"}}
        initial={{opacity:0,y:28}} animate={{opacity:1,y:0}} transition={{duration:0.42}}>

        <div style={{textAlign:"center",marginBottom:"1.75rem"}}>
          <div style={{width:52,height:52,borderRadius:14,
            background:"linear-gradient(135deg,#3b7ef8,#60a5fa)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:24,margin:"0 auto 0.9rem",
            boxShadow:"0 6px 20px rgba(59,126,248,0.28)"}}>🎓</div>
          <h1 style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-0.03em",color:"#0f172a"}}>
            Create account
          </h1>
          <p style={{color:"#64748b",marginTop:"0.3rem",fontSize:"0.88rem"}}>Join SmartExam AI today</p>
        </div>

        <div className="glass-strong" style={{padding:"2rem 2.25rem"}}>
          {error && <div className="err-box" style={{marginBottom:"1rem"}}>⚠️ {error}</div>}

          <form onSubmit={handleRegister} style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            {fields.map(({k,l,t,p})=>(
              <div key={k}>
                <label className="input-label">{l}</label>
                <input className="input" type={t} placeholder={p}
                  value={form[k]} onChange={set(k)} required/>
              </div>
            ))}
            <button type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={loading} style={{marginTop:"0.25rem"}}>
              {loading ? <><span className="spin"/> Creating account...</> : "Create Account →"}
            </button>
          </form>

          <hr className="div"/>
          <p style={{textAlign:"center",color:"#64748b",fontSize:"0.84rem"}}>
            Already have an account?{" "}
            <Link to="/login" style={{color:"#3b7ef8",textDecoration:"none",fontWeight:600}}>Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
