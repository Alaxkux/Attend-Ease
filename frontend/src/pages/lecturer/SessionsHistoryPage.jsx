import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Users, Clock, Download, Loader } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./SessionsHistoryPage.css";

export default function SessionsHistoryPage() {
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const courseId = searchParams.get("course");
      const url = courseId ? `/lecturer/sessions?course=${courseId}` : "/lecturer/sessions";
      const { data } = await api.get(url);
      setSessions(data.sessions || []);
    } catch { toast.error("Failed to load sessions"); }
    finally { setLoading(false); }
  };

  const exportSession = async (sessionId, courseCode) => {
    try {
      const { data } = await api.get(`/lecturer/session/${sessionId}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url; a.download = `attendance-${courseCode}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  };

  return (
    <div className="page">
      <TopBar title="Session History" back="/lecturer" showLogout />
      <div className="sh-content">
        {loading ? (
          <div className="sh-loading"><Loader size={24} className="spin-anim" /></div>
        ) : sessions.length === 0 ? (
          <div className="sh-empty"><p>No past sessions yet</p></div>
        ) : (
          <div className="sh-list">
            {sessions.map((s, i) => (
              <div key={i} className="sh-row">
                <div className="sh-left">
                  <div className="sh-code">{s.courseCode}</div>
                  <div className="sh-name">{s.courseName}</div>
                  <div className="sh-meta">
                    <Clock size={11} /> {new Date(s.windowStart).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })} · {formatTime(s.windowStart)} – {formatTime(s.windowEnd)}
                  </div>
                </div>
                <div className="sh-right">
                  <div className="sh-count"><Users size={12} /> {s.attendees?.length || 0}</div>
                  <button className="sh-export" onClick={() => exportSession(s._id, s.courseCode)}>
                    <Download size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(d) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
