import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import "./Onboarding.css";

const SLIDES = [
  { emoji:"📋", title:"Smart Attendance", body:"Mark attendance via QR code or GPS location — no more paper sheets or manual roll calls.", color:"var(--green)" },
  { emoji:"🔒", title:"Fraud-Proof", body:"QR codes refresh every 30 seconds. Location check-in verifies you're actually in the classroom.", color:"var(--blue)" },
  { emoji:"📊", title:"AI-Powered Insights", body:"Track your patterns, spot risks early, and get personalised AI analysis of your attendance behaviour.", color:"var(--purple)" },
];

export default function Onboarding() {
  const [slide, setSlide] = useState(0);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleDone = async () => {
    try {
      await api.post("/profile/onboarding-done");
      updateUser({ hasSeenOnboarding: true });
    } catch {/* silent */}
    navigate(user?.role === "lecturer" ? "/lecturer" : user?.role === "admin" ? "/admin" : "/student");
  };

  const isLast = slide === SLIDES.length - 1;

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <button className="skip-btn" onClick={handleDone}>Skip</button>

        <div className="slides-wrapper" style={{ transform: `translateX(-${slide * 100}%)` }}>
          {SLIDES.map((s, i) => (
            <div key={i} className="slide">
              <div className="slide-emoji" style={{ background: `${s.color}18` }}>{s.emoji}</div>
              <h2 className="slide-title">{s.title}</h2>
              <p className="slide-body">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="dots">
          {SLIDES.map((_, i) => (
            <div key={i} className={`dot ${i === slide ? "active" : ""}`} onClick={() => setSlide(i)} />
          ))}
        </div>

        <button className="btn btn-primary onboarding-btn" onClick={() => isLast ? handleDone() : setSlide(s => s+1)}>
          {isLast ? "Get Started 🚀" : "Next"}
        </button>
      </div>
    </div>
  );
}
