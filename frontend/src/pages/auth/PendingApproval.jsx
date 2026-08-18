import { useNavigate } from "react-router-dom";
import { Clock, ArrowLeft } from "lucide-react";
import "./Auth.css";

export default function PendingApproval() {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <div className="auth-container animate-fadeUp" style={{textAlign:"center",alignItems:"center"}}>
        <div style={{width:80,height:80,borderRadius:24,background:"var(--amber-subtle)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Clock size={36} color="var(--amber)"/>
        </div>
        <h2 className="auth-logo-name">Pending Approval</h2>
        <p className="auth-logo-tagline">Your lecturer account has been verified and is awaiting admin approval. You'll be notified once approved.</p>
        <div style={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:16,width:"100%"}}>
          <p style={{fontSize:"0.82rem",color:"var(--text-muted)",lineHeight:1.6}}>This usually takes less than 24 hours. Check your email for updates.</p>
        </div>
        <button className="btn btn-secondary" style={{gap:8}} onClick={() => navigate("/")}>
          <ArrowLeft size={16}/> Back to Sign In
        </button>
      </div>
    </div>
  );
}
