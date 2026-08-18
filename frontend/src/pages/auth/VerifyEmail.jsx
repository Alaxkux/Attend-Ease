import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./Auth.css";

export default function VerifyEmail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [otp, setOtp] = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef([]);

  useEffect(() => {
    if (!state?.userId) navigate("/");
    const timer = setInterval(() => setCountdown(c => c > 0 ? c-1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i+1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i-1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/verify-otp", { userId: state.userId, otp: code });
      if (data.pendingApproval) {
        toast.success("Email verified! Awaiting admin approval.");
        navigate("/pending-approval");
        return;
      }
      if (data.token) {
        localStorage.setItem("ae_token", data.token);
        localStorage.setItem("ae_user", JSON.stringify(data.user));
        api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
        toast.success("Account verified! Welcome 🎉");
        navigate(data.user.role === "lecturer" ? "/lecturer" : "/student");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid code");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-otp", { userId: state.userId });
      toast.success("New code sent!");
      setCountdown(60);
      setOtp(["","","","","",""]);
      inputs.current[0]?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend");
    } finally { setResending(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-fadeUp">
        <div className="verify-icon"><Mail size={36} color="var(--green)"/></div>
        <div style={{textAlign:"center"}}>
          <h2 className="auth-logo-name">Check your email</h2>
          <p className="auth-logo-tagline">We sent a 6-digit code to <strong>{state?.email}</strong></p>
        </div>

        <div className="otp-inputs">
          {otp.map((val, i) => (
            <input key={i} ref={el => inputs.current[i] = el}
              className="otp-box" type="text" inputMode="numeric"
              maxLength={1} value={val}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <button className="btn btn-primary auth-submit" onClick={handleVerify} disabled={loading}>
          {loading ? <span className="auth-spinner"/> : <>Verify Account <ArrowRight size={18}/></>}
        </button>

        <div className="resend-row">
          {countdown > 0 ? (
            <p className="auth-switch">Resend code in <strong>{countdown}s</strong></p>
          ) : (
            <button className="resend-btn" onClick={handleResend} disabled={resending}>
              <RefreshCw size={14}/> {resending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>

        <button className="btn btn-secondary" onClick={() => navigate("/")}>Back to Sign In</button>
      </div>
    </div>
  );
}
