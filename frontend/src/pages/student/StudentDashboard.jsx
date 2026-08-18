import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Flame, AlertTriangle, ChevronRight, Clock, CheckCircle2, BookOpen } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import TopBar from "../../components/shared/TopBar";
import NotificationBell from "../../components/shared/NotificationBell";
import StatRing from "../../components/shared/StatRing";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./StudentDashboard.css";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function CourseCard({ course, onMark }) {
  const statusMap = {
    "in-progress": { label: "In Progress", cls: "green", icon: <span className="pulse-dot" /> },
    upcoming: { label: "Upcoming", cls: "blue", icon: <Clock size={12} /> },
    ended: { label: "Ended", cls: "muted", icon: null },
    marked: { label: "Marked", cls: "green", icon: <CheckCircle2 size={12} /> },
  };
  const s = statusMap[course.status] || statusMap.upcoming;

  return (
    <div className={`course-card ${course.status === "in-progress" ? "active" : ""}`}>
      <div className="course-card-left">
        <div className="course-icon">
          <BookOpen size={18} />
        </div>
        <div>
          <div className="course-code">{course.courseCode}</div>
          <div className="course-name">{course.courseName}</div>
          <div className="course-time">
            <Clock size={11} /> {course.startTime} – {course.endTime}
          </div>
        </div>
      </div>
      <div className="course-card-right">
        {course.status === "in-progress" && (
          <button className="btn-mark" onClick={() => onMark(course)}>Mark Now</button>
        )}
        {course.status === "upcoming" && (
          <span className={`badge badge-blue`}><Clock size={10} /> {s.label}</span>
        )}
        {course.status === "marked" && (
          <span className="badge badge-green"><CheckCircle2 size={10} /> Marked</span>
        )}
        {course.status === "ended" && (
          <span className="badge" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>Ended</span>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ overallAttendance: 0, streak: 0, atRisk: false, classesAttended: 0, totalClasses: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    // Poll every 30s to refresh status
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get("/student/dashboard");
      setCourses(data.todaysCourses || []);
      setStats(data.stats || {});
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleMark = (course) => {
    navigate(`/student/attend/${course._id}`);
  };

  const firstName = user?.name?.split(" ")[0] || "Student";

  return (
    <div className="page">
      <TopBar
        showLogout
        actions={<NotificationBell to="/student/notifications" />}
      />

      <div className="student-dash">
        {/* Greeting */}
        <div className="dash-greeting animate-fadeUp">
          <div>
            <p className="greeting-sub">{getGreeting()},</p>
            <h1 className="greeting-name">{firstName} 👋</h1>
          </div>
          {stats.atRisk && (
            <div className="risk-badge">
              <AlertTriangle size={14} />
              At Risk
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="quick-stats quick-stats-3 animate-fadeUp" style={{ animationDelay: "0.05s" }}>
          <div className="stat-card">
            <StatRing value={stats.overallAttendance || 0} size={80} stroke={7} />
            <span className="stat-label">Overall Attendance</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <div className="streak-display">
              <Flame size={26} color={stats.streak > 0 ? "var(--amber)" : "var(--text-muted)"} />
              <span className="streak-num">{stats.streak || 0}</span>
            </div>
            <span className="stat-label">Day Streak</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-card">
            <div className="streak-display">
              <CheckCircle2 size={26} color="var(--accent)" />
              <span className="streak-num">{stats.classesAttended ?? 0}</span>
            </div>
            <span className="stat-label">Classes Attended</span>
          </div>
        </div>

        {/* At risk warning */}
        {stats.atRisk && (
          <div className="risk-alert animate-fadeUp">
            <AlertTriangle size={18} color="var(--amber)" />
            <div>
              <strong>Attendance at risk</strong>
              <p>Your attendance has dropped below 75%. Act now to avoid being barred from exams.</p>
            </div>
          </div>
        )}

        <div className="dash-columns">
        {/* Today's classes */}
        <section className="dash-section animate-fadeUp" style={{ animationDelay: "0.1s" }}>
          <div className="section-header">
            <h2 className="section-title">Today's Classes</h2>
            <button className="btn-ghost" onClick={() => navigate("/student/courses")}>
              All courses <ChevronRight size={14} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={32} color="var(--text-muted)" />
              <p>No classes today</p>
            </div>
          ) : (
            <div className="courses-list">
              {courses.map(c => (
                <CourseCard key={c._id} course={c} onMark={handleMark} />
              ))}
            </div>
          )}
        </section>

        {/* Shortcuts */}
        <section className="dash-section animate-fadeUp" style={{ animationDelay: "0.15s" }}>
          <h2 className="section-title">Quick Access</h2>
          <div className="shortcuts">
            <button className="shortcut-card" onClick={() => navigate("/student/history")}>
              <span className="shortcut-icon">📋</span>
              <span>History</span>
            </button>
            <button className="shortcut-card" onClick={() => navigate("/student/insights")}>
              <span className="shortcut-icon">📊</span>
              <span>Insights</span>
            </button>
            <button className="shortcut-card" onClick={() => navigate("/student/courses")}>
              <span className="shortcut-icon">📚</span>
              <span>Courses</span>
            </button>
            <button className="shortcut-card" onClick={() => navigate("/student/schedule")}>
              <span className="shortcut-icon">🗓️</span>
              <span>Timetable</span>
            </button>
            <button className="shortcut-card" onClick={() => navigate("/profile")}>
              <span className="shortcut-icon">👤</span>
              <span>Profile</span>
            </button>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}
