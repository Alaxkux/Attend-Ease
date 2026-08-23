import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BookOpen, Users, ChevronRight, Play, Copy, CheckCircle2, GraduationCap, Activity, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import DashNav from "../../components/shared/DashNav";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import "./LecturerDashboard.css";

export default function LecturerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [trend, setTrend] = useState([]);
  const [stats, setStats] = useState({ totalStudents: 0, totalSessions: 0, avgAttendance: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ courseCode: "", courseName: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get("/lecturer/dashboard");
      setCourses(data.courses || []);
      setTrend(data.trend || []);
      setStats(data.stats || {});
    } catch { toast.error("Failed to load dashboard"); }
    finally { setLoading(false); }
  };

  const createCourse = async () => {
    if (!createForm.courseCode || !createForm.courseName) return toast.error("Fill in all fields");
    setCreating(true);
    try {
      await api.post("/lecturer/courses", createForm);
      toast.success("Course created!");
      setShowCreate(false);
      setCreateForm({ courseCode: "", courseName: "" });
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create course");
    } finally { setCreating(false); }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Enrollment code copied!");
  };

  const firstName = user?.name?.split(" ")[0] || "Lecturer";

  return (
    <div className="page lec-page-wide">
      <DashNav
        icon={<GraduationCap size={22} />}
        brandTitle="Lecturer Attendance"
        brandSubtitle="University System"
        notificationsPath="/lecturer/notifications"
      />

      {/* Create Course Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Course</h3>
              <button className="modal-close-btn" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="input-group">
              <label>Course Code</label>
              <input className="input-field" placeholder="e.g. CSC 301"
                value={createForm.courseCode}
                onChange={e => setCreateForm(f => ({ ...f, courseCode: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>Course Name</label>
              <input className="input-field" placeholder="e.g. Software Engineering"
                value={createForm.courseName}
                onChange={e => setCreateForm(f => ({ ...f, courseName: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={createCourse} disabled={creating}>
              {creating ? <span className="auth-spinner" /> : "Create Course"}
            </button>
          </div>
        </div>
      )}

      <div className="lec-dash">
        <div className="dash-welcome-row animate-fadeUp">
          <h1 className="dash-welcome-title">
            Welcome back, {user?.name?.startsWith("Dr") || user?.name?.startsWith("Prof") ? user.name : `Dr. ${firstName}`}
          </h1>
          <button className="btn btn-primary dash-new-course-btn" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> New Course
          </button>
        </div>

        {/* Overview stats */}
        <div className="lec-stats-row animate-fadeUp">
          <div className="lec-stat-card">
            <div className="lec-stat-icon"><Users size={20} /></div>
            <div>
              <span className="lec-stat-label-top">Students</span>
              <span className="lec-stat-num">{stats.totalStudents || 0}</span>
            </div>
          </div>
          <div className="lec-stat-card">
            <div className="lec-stat-icon"><Calendar size={20} /></div>
            <div>
              <span className="lec-stat-label-top">Sessions</span>
              <span className="lec-stat-num">{stats.totalSessions || 0}</span>
            </div>
          </div>
          <div className="lec-stat-card">
            <div className="lec-stat-icon"><Activity size={20} /></div>
            <div>
              <span className="lec-stat-label-top">Avg. Attendance</span>
              <span className="lec-stat-num">{stats.avgAttendance || 0}%</span>
            </div>
          </div>
        </div>

        <div className="dash-columns">
        {/* Courses */}
        <section className="dash-section animate-fadeUp">
          <h2 className="section-title">My Courses</h2>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={36} color="var(--text-muted)" />
              <p>No courses yet. Create one to get started.</p>
              <button className="btn btn-primary" style={{ width: "auto", padding: "12px 24px" }} onClick={() => setShowCreate(true)}>
                <Plus size={15} /> Create Course
              </button>
            </div>
          ) : (
            <div className="lec-courses-list">
              {courses.map(c => (
                <div key={c._id} className="lec-course-card">
                  <div className="lec-course-top">
                    <div className="lec-course-info">
                      <span className="lec-course-code">{c.courseCode}</span>
                      <span className="lec-course-name">{c.courseName}</span>
                    </div>
                    <div className="lec-course-actions">
                      <button className="start-session-btn" onClick={() => navigate(`/lecturer/session/${c._id}`)}>
                        <Play size={13} fill="currentColor" /> Start
                      </button>
                      <button className="icon-btn-sm" onClick={() => navigate(`/lecturer/reports/${c._id}`)}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="lec-course-meta">
                    <span><Users size={12} /> {c.studentCount || 0} students</span>
                    <span>Code: <strong className="enroll-code" onClick={() => copyCode(c.enrollmentCode)}>
                      {c.enrollmentCode} <Copy size={10} />
                    </strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="dash-col-right">
        {/* Analytics chart */}
        {trend && trend.length > 0 && (
          <div className="card animate-fadeUp">
            <h2 className="section-title" style={{marginBottom:16}}>Attendance Trend</h2>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis hide domain={[0,100]}/>
                <Tooltip contentStyle={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}} labelStyle={{color:"var(--text-primary)"}} formatter={(v) => [`${v}%`,"Attendance"]}/>
                <Line type="monotone" dataKey="rate" stroke="var(--green)" strokeWidth={2} dot={{fill:"var(--green)",r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Quick Access */}
        <section className="dash-section animate-fadeUp">
          <h2 className="section-title">Quick Access</h2>
          <div className="shortcuts">
            <button className="shortcut-card" onClick={() => navigate("/lecturer/sessions")}>
              <span className="shortcut-icon">📋</span>
              <span>Sessions</span>
            </button>
            <button className="shortcut-card" onClick={() => navigate("/lecturer/students")}>
              <span className="shortcut-icon">👥</span>
              <span>Students</span>
            </button>
            <button className="shortcut-card" onClick={() => navigate("/lecturer/reports")}>
              <span className="shortcut-icon">📊</span>
              <span>Reports</span>
            </button>
          </div>
        </section>
        </div>
        </div>
      </div>
    </div>
  );
}