import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./Auth.css";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!form.password || !form.confirm) return toast.error("Fill in all fields");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    if (!token) return toast.error("Invalid reset link");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password: form.password });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed. Link may have expired.");
    } finally { setLoading(false); }
  };

  if (done) return (
    <div className="auth-page">
      <div className="auth-container animate-fadeUp" style={{ textAlign: "center", alignItems: "center" }}>
        <CheckCircle size={56} color="var(--green)" />
        <h2 className="auth-logo-name">Password Reset!</h2>
        <p className="auth-logo-tagline">Your password has been changed successfully.</p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>Back to Sign In</button>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-container animate-fadeUp">
        <div>
          <h2 className="auth-logo-name">Set New Password</h2>
          <p className="auth-logo-tagline">Choose a strong password for your account</p>
        </div>
        <div className="auth-form">
          <div className="input-group">
            <label>New Password</label>
            <div className="input-password-wrap">
              <input className="input-field" type={showPass ? "text" : "password"} placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <button className="pass-toggle" onClick={() => setShowPass(s => !s)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="input-group">
            <label>Confirm New Password</label>
            <input className="input-field" type="password" placeholder="Repeat password"
              value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
          <button className="btn btn-primary auth-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="auth-spinner" /> : <>Reset Password <ArrowRight size={18} /></>}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/")}>Back to Sign In</button>
        </div>
      </div>
    </div>
  );
}
