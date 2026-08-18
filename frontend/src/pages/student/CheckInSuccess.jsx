import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Flame } from "lucide-react";
import "./CheckInSuccess.css";

export default function CheckInSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation();

  useEffect(() => {
    const t = setTimeout(() => navigate("/student"), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="success-page">
      <div className="success-container animate-fadeUp">
        <div className="success-rings">
          <div className="ring ring-1"/>
          <div className="ring ring-2"/>
          <div className="ring ring-3"/>
          <div className="success-icon"><CheckCircle size={48} color="#fff"/></div>
        </div>

        <h2 className="success-title">
          {state?.status === "late" ? "Marked Late" : "Attendance Confirmed!"}
        </h2>
        <p className="success-course">{state?.courseCode} — {state?.courseName}</p>

        {state?.status === "late" ? (
          <div className="success-note late">
            ⏰ You were marked <strong>late</strong>. Try to arrive earlier next time.
          </div>
        ) : (
          <div className="success-note present">
            ✅ You've been marked <strong>present</strong> for this session.
          </div>
        )}

        {state?.streak > 0 && (
          <div className="streak-celebration">
            <Flame size={20} color="var(--amber)"/>
            <span>{state.streak} session streak! 🔥</span>
          </div>
        )}

        <div className="success-countdown">
          Returning to dashboard in a moment...
        </div>

        <button className="btn btn-secondary" onClick={() => navigate("/student")}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
