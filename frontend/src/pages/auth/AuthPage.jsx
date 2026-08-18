import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, GraduationCap, BookOpen, Shield, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";
import "./Auth.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("student");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", password:"", matricOrStaff:"", department:"" });
  const [showReview, setShowReview] = useState(false);
  const { login, register } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) return toast.error("Fill in all fields");
    if (mode === "register" && !form.name) return toast.error("Enter your name");
    if (mode === "register" && role !== "admin" && !form.matricOrStaff)
      return toast.error(role === "student" ? "Enter your matric number" : "Enter your staff ID");

    if (mode === "register") {
      // Show a review step before actually creating the account
      setShowReview(true);
      return;
    }

    setLoading(true);
    try {
      const user = await login(form.email, form.password, role);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      navigate(user.role === "lecturer" ? "/lecturer" : user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) return navigate("/verify-email", { state: { userId: data.userId, email: form.email } });
      if (data?.pendingApproval) return toast.error("Your account is pending admin approval");
      toast.error(data?.message || "Something went wrong");
    } finally { setLoading(false); }
  };

  const confirmRegister = async () => {
    setLoading(true);
    try {
      const result = await register({ name: form.name, email: form.email, password: form.password, role, department: form.department, ...(role === "student" ? { matricNumber: form.matricOrStaff } : { staffId: form.matricOrStaff }) });
      setShowReview(false);
      if (result.requiresVerification) {
        navigate("/verify-email", { state: { userId: result.userId, email: form.email, pendingApproval: result.requiresApproval } });
      }
    } catch (err) {
      const data = err.response?.data;
      setShowReview(false);
      if (data?.requiresVerification) return navigate("/verify-email", { state: { userId: data.userId, email: form.email } });
      toast.error(data?.message || "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <button className="auth-theme-btn" onClick={toggle}>{theme === "dark" ? "☀️" : "🌙"}</button>

      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-badge">Smart attendance, verified</div>
          <h1 className="auth-hero-title">Attendance that<br/>can't be faked.</h1>
          <p className="auth-hero-sub">QR check-in, GPS-verified in real time. Built for lecturers and students who are done with paper sign-in sheets.</p>
          <div className="auth-hero-radar">
            <div className="radar-ring r1" /><div className="radar-ring r2" /><div className="radar-ring r3" />
            <div className="radar-dot" />
          </div>
          <div className="auth-hero-stats">
            <div><strong>3s</strong><span>Avg. check-in</span></div>
            <div><strong>100%</strong><span>Location-verified</span></div>
            <div><strong>0</strong><span>Proxy sign-ins</span></div>
          </div>
        </div>
      </div>

      <div className="auth-container animate-fadeUp">
        <div className="auth-logo">
          <div className="auth-logo-icon"><span>AE</span></div>
          <div>
            <h1 className="auth-logo-name">AttendEase</h1>
            <p className="auth-logo-tagline">Stress-free attendance tracking</p>
          </div>
        </div>

        <div className="role-toggle">
          {[{id:"student",label:"Student",icon:<GraduationCap size={15}/>},{id:"lecturer",label:"Lecturer",icon:<BookOpen size={15}/>},{id:"admin",label:"Admin",icon:<Shield size={15}/>}].map(r => (
            <button key={r.id} className={`role-btn ${role === r.id ? "active" : ""}`} onClick={() => setRole(r.id)}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Sign In</button>
          <button className={`auth-tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Sign Up</button>
        </div>

        <div className="auth-form">
          {mode === "register" && (
            <div className="input-group">
              <label>Full Name</label>
              <input className="input-field" placeholder={role === "student" ? "e.g. Al-Ameen Yusuf" : "e.g. Dr. Okon"} value={form.name} onChange={set("name")} onKeyDown={e => e.key==="Enter"&&handleSubmit()} />
            </div>
          )}
          <div className="input-group">
            <label>Email Address</label>
            <div className="input-with-icon">
              <input className="input-field" type="email" placeholder="your@email.com" value={form.email} onChange={set("email")} onKeyDown={e => e.key==="Enter"&&handleSubmit()} />
              <Mail size={16} className="input-icon" />
            </div>
          </div>
          {mode === "register" && role !== "admin" && (
            <div className="input-group">
              <label>{role === "student" ? "Matric Number" : "Staff ID"}</label>
              <input className="input-field" placeholder={role === "student" ? "e.g. CSC/2021/001" : "e.g. STAFF/2019/042"} value={form.matricOrStaff} onChange={set("matricOrStaff")} style={{fontFamily:"var(--font-mono)"}} />
            </div>
          )}
          {mode === "register" && (
            <div className="input-group">
              <label>Department <span style={{color:"var(--text-muted)",fontWeight:400}}>(optional)</span></label>
              <input className="input-field" placeholder="e.g. Computer Science" value={form.department} onChange={set("department")} />
            </div>
          )}
          <div className="input-group">
            <label>Password</label>
            <div className="input-password-wrap">
              <input className="input-field" type={showPass ? "text" : "password"} placeholder="••••••••" value={form.password} onChange={set("password")} onKeyDown={e => e.key==="Enter"&&handleSubmit()} />
              <button className="pass-toggle" onClick={() => setShowPass(s=>!s)}>{showPass ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
            </div>
          </div>
          {mode === "login" && (
            <button className="forgot-link" onClick={() => navigate("/forgot-password")}>Forgot password?</button>
          )}
          <button className="btn btn-primary auth-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="auth-spinner"/> : <>{mode === "login" ? "Sign In" : "Create Account"}<ArrowRight size={18}/></>}
          </button>
        </div>

        <p className="auth-switch">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(m => m==="login"?"register":"login")}>{mode === "login" ? "Sign up" : "Sign in"}</button>
        </p>
      </div>

      {showReview && (
        <div className="confirm-overlay" onClick={() => !loading && setShowReview(false)}>
          <div className="confirm-card animate-fadeUp" onClick={e => e.stopPropagation()}>
            <h3 className="confirm-title">Confirm your details</h3>
            <p className="confirm-body">Please review before creating your account.</p>
            <div className="review-details">
              <div className="review-row"><span>Role</span><strong style={{textTransform:"capitalize"}}>{role}</strong></div>
              <div className="review-row"><span>Full Name</span><strong>{form.name}</strong></div>
              <div className="review-row"><span>Email</span><strong>{form.email}</strong></div>
              {role !== "admin" && (
                <div className="review-row">
                  <span>{role === "student" ? "Matric Number" : "Staff ID"}</span>
                  <strong>{form.matricOrStaff}</strong>
                </div>
              )}
              {form.department && (
                <div className="review-row"><span>Department</span><strong>{form.department}</strong></div>
              )}
            </div>
            <div className="confirm-actions">
              <button className="btn btn-secondary confirm-cancel" onClick={() => setShowReview(false)} disabled={loading}>
                Go Back &amp; Edit
              </button>
              <button className="btn btn-primary confirm-ok" onClick={confirmRegister} disabled={loading}>
                {loading ? <span className="auth-spinner" /> : "Confirm & Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
