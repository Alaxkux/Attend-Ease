import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, Shield, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";
import "./Auth.css";

// Deliberately not linked from anywhere in the public UI. Reachable only by
// typing the URL directly. This is obscurity, not real access control — the
// actual protection is still the admin account's password, same as any login.
export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email || !password) return toast.error("Fill in all fields");
    setLoading(true);
    try {
      const user = await login(email, password, "admin");
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      navigate("/admin");
    } catch (err) {
      const data = err.response?.data;
      toast.error(data?.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <button className="auth-theme-btn" onClick={toggle}>{theme === "dark" ? "☀️" : "🌙"}</button>

      <div className="auth-container animate-fadeUp">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ background: "var(--blue-subtle)", color: "var(--blue)" }}>
            <Shield size={20} />
          </div>
          <div>
            <h1 className="auth-logo-name">Admin Access</h1>
            <p className="auth-logo-tagline">AttendEase administration</p>
          </div>
        </div>

        <div className="auth-form">
          <div className="input-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <input className="input-field" type="email" placeholder="admin@yourdomain.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              <Mail size={16} className="input-icon" />
            </div>
          </div>
          <div className="input-group">
            <label>Password</label>
            <div className="input-password-wrap">
              <input className="input-field" type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
              <button className="pass-toggle" onClick={() => setShowPass(s => !s)}>{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
            </div>
          </div>
          <button className="btn btn-primary auth-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="auth-spinner" /> : <>Sign In<ArrowRight size={18}/></>}
          </button>
        </div>

        <p className="auth-switch" style={{ opacity: 0.6 }}>
          Not an admin? <a href="/" style={{ color: "var(--accent)", fontWeight: 700 }}>Go to the main sign-in</a>
        </p>
      </div>
    </div>
  );
}