import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email) return toast.error("Enter your email");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-fadeUp">
        <button className="back-btn" onClick={() => navigate("/")}><ArrowLeft size={16}/> Back to Sign In</button>
        {sent ? (
          <div style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
            <CheckCircle size={56} color="var(--green)"/>
            <h2 className="auth-logo-name">Check your email</h2>
            <p className="auth-logo-tagline">If an account with <strong>{email}</strong> exists, a password reset link has been sent.</p>
            <button className="btn btn-primary" onClick={() => navigate("/")}>Back to Sign In</button>
          </div>
        ) : (
          <>
            <div>
              <h2 className="auth-logo-name">Forgot Password?</h2>
              <p className="auth-logo-tagline">Enter your email and we'll send you a reset link</p>
            </div>
            <div className="auth-form">
              <div className="input-group">
                <label>Email Address</label>
                <input className="input-field" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleSubmit()}/>
              </div>
              <button className="btn btn-primary auth-submit" onClick={handleSubmit} disabled={loading}>
                {loading ? <span className="auth-spinner"/> : <>Send Reset Link <ArrowRight size={18}/></>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
