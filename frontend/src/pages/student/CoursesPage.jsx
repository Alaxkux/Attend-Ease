import { useState, useEffect } from "react";
import { Plus, BookOpen, ChevronRight, Copy, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopBar from "../../components/shared/TopBar";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./CoursesPage.css";

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [code, setCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await api.get("/student/courses");
      setCourses(data.courses || []);
    } catch { toast.error("Failed to load courses"); }
    finally { setLoading(false); }
  };

  const handleEnroll = async () => {
    if (!code.trim()) return toast.error("Enter an enrollment code");
    setEnrolling(true);
    try {
      await api.post("/student/enroll", { code: code.trim().toUpperCase() });
      toast.success("Enrolled successfully!");
      setShowEnroll(false);
      setCode("");
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid code");
    } finally { setEnrolling(false); }
  };

  const getPatternColor = (rate) => {
    if (rate >= 85) return "green";
    if (rate >= 75) return "amber";
    return "red";
  };

  return (
    <div className="page">
      <TopBar title="My Courses" back="/student" showLogout
        actions={
          <button className="topbar-icon-btn" onClick={() => setShowEnroll(true)}>
            <Plus size={18} />
          </button>
        }
      />

      {/* Enroll modal */}
      {showEnroll && (
        <div className="modal-overlay" onClick={() => setShowEnroll(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Enroll in a Course</h3>
              <button className="btn-ghost" onClick={() => setShowEnroll(false)}><X size={18} /></button>
            </div>
            <p className="modal-sub">Enter the enrollment code provided by your lecturer</p>
            <input
              className="input-field"
              placeholder="e.g. CSC301-X9K2"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleEnroll()}
              style={{ textTransform: "uppercase", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
            />
            <button className="btn btn-primary" onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? <span className="auth-spinner" /> : "Enroll Now"}
            </button>
          </div>
        </div>
      )}

      <div className="courses-content">
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-courses">
            <BookOpen size={48} color="var(--text-muted)" />
            <h3>No courses yet</h3>
            <p>Use the + button to enroll with a course code</p>
            <button className="btn btn-primary" style={{ width: "auto", padding: "12px 24px" }} onClick={() => setShowEnroll(true)}>
              <Plus size={16} /> Enroll Now
            </button>
          </div>
        ) : (
          <div className="full-courses-list">
            {courses.map(c => {
              const color = getPatternColor(c.attendanceRate || 0);
              return (
                <button key={c._id} className="full-course-card" onClick={() => navigate(`/student/history?course=${c._id}`)}>
                  <div className="fcc-left">
                    <div className="fcc-icon" style={{ background: `rgba(${color === "green" ? "34,197,94" : color === "amber" ? "245,158,11" : "239,68,68"},0.1)` }}>
                      <BookOpen size={18} color={`var(--${color})`} />
                    </div>
                    <div>
                      <div className="fcc-code">{c.courseCode}</div>
                      <div className="fcc-name">{c.courseName}</div>
                      <div className="fcc-lecturer">👨‍🏫 {c.lecturer}</div>
                    </div>
                  </div>
                  <div className="fcc-right">
                    <span className={`fcc-rate ${color}`}>{c.attendanceRate || 0}%</span>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
