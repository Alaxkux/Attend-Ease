import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, BookOpen, CheckSquare, Clock, AlertTriangle, ChevronRight, Bell, Send } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import TopBar from "../../components/shared/TopBar";
import NotificationBell from "../../components/shared/NotificationBell";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingAlerts, setSendingAlerts] = useState(false);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try { const { data: d } = await api.get("/admin/dashboard"); setData(d); }
    catch { toast.error("Failed to load dashboard"); }
    finally { setLoading(false); }
  };

  const sendAlerts = async () => {
    setSendingAlerts(true);
    try { const { data: d } = await api.post("/admin/send-risk-alerts"); toast.success(d.message); }
    catch { toast.error("Failed to send alerts"); }
    finally { setSendingAlerts(false); }
  };

  const stats = data?.stats || {};
  const trend = data?.trend || [];

  return (
    <div className="page">
      <TopBar showLogout actions={<NotificationBell to="/admin/notifications" />}/>
      <div className="admin-dash">
        <div className="admin-greeting animate-fadeUp">
          <div><p className="greeting-sub">Admin Portal</p><h1 className="greeting-name">Dashboard 🏛️</h1></div>
          <button className="btn-alert" onClick={sendAlerts} disabled={sendingAlerts}>
            {sendingAlerts ? "Sending..." : <><Send size={13}/> Risk Alerts</>}
          </button>
        </div>

        <div className="admin-stats-grid animate-fadeUp">
          {[
            { label:"Students", value:stats.totalStudents||0, icon:<Users size={18}/>, color:"var(--green)", path:"/admin/students" },
            { label:"Lecturers", value:stats.totalLecturers||0, icon:<BookOpen size={18}/>, color:"var(--blue)", path:"/admin/lecturers" },
            { label:"Courses", value:stats.totalCourses||0, icon:<BookOpen size={18}/>, color:"var(--purple)", path:"/admin/courses" },
            { label:"Sessions", value:stats.totalSessions||0, icon:<CheckSquare size={18}/>, color:"var(--amber)", path:null },
          ].map((s,i) => (
            <div key={i} className={`admin-stat-card ${s.path?"clickable":""}`} onClick={() => s.path&&navigate(s.path)}>
              <div className="asc-icon" style={{background:`${s.color}18`,color:s.color}}>{s.icon}</div>
              <div className="asc-num">{s.value}</div>
              <div className="asc-label">{s.label}</div>
            </div>
          ))}
        </div>

        {(stats.pendingLecturers>0||stats.pendingExcuses>0) && (
          <div className="admin-alerts animate-fadeUp">
            {stats.pendingLecturers>0 && (
              <button className="admin-alert-row" onClick={() => navigate("/admin/lecturers")}>
                <AlertTriangle size={16} color="var(--amber)"/>
                <span><strong>{stats.pendingLecturers}</strong> lecturer{stats.pendingLecturers>1?"s":""} awaiting approval</span>
                <ChevronRight size={14} color="var(--text-muted)"/>
              </button>
            )}
            {stats.pendingExcuses>0 && (
              <button className="admin-alert-row" onClick={() => navigate("/admin/excuses")}>
                <Clock size={16} color="var(--blue)"/>
                <span><strong>{stats.pendingExcuses}</strong> pending excuse{stats.pendingExcuses>1?"s":""}</span>
                <ChevronRight size={14} color="var(--text-muted)"/>
              </button>
            )}
          </div>
        )}

        {trend.length>0 && (
          <div className="card animate-fadeUp">
            <h3 className="section-title" style={{marginBottom:16}}>Recent Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis hide domain={[0,100]}/>
                <Tooltip contentStyle={{background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,fontSize:12}}/>
                <Line type="monotone" dataKey="rate" stroke="var(--green)" strokeWidth={2} dot={{fill:"var(--green)",r:3}} name="Attendance %"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="admin-shortcuts animate-fadeUp">
          {[{emoji:"👨‍🏫",label:"Lecturers",path:"/admin/lecturers"},{emoji:"👥",label:"Students",path:"/admin/students"},{emoji:"📚",label:"Courses",path:"/admin/courses"},{emoji:"⚙️",label:"Policy",path:"/admin/policy"},{emoji:"📋",label:"Excuses",path:"/admin/excuses"},{emoji:"👤",label:"Profile",path:"/profile"}].map((s,i) => (
            <button key={i} className="shortcut-card" onClick={() => navigate(s.path)}>
              <span className="shortcut-icon">{s.emoji}</span><span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
