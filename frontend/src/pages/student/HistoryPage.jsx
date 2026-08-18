import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle, Loader, FileText, X } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import ConfirmModal from "../../components/shared/ConfirmModal";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./HistoryPage.css";

const statusIcon = {
  present: <CheckCircle2 size={13} color="var(--green)" />,
  late: <Clock size={13} color="var(--amber)" />,
  absent: <XCircle size={13} color="var(--red)" />,
  excused: <CheckCircle2 size={13} color="var(--blue)" />,
};
const statusColor = { present: "badge-green", late: "badge-amber", absent: "badge-red", excused: "badge-blue" };

export default function HistoryPage() {
  const [searchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get("course") || "all");
  const [loading, setLoading] = useState(true);
  const [excuseModal, setExcuseModal] = useState(null); // session object
  const [excuseReason, setExcuseReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmExcuse, setConfirmExcuse] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get("/student/history");
      setSessions(data.sessions || []);
      setCourses(data.courses || []);
    } catch { toast.error("Failed to load history"); }
    finally { setLoading(false); }
  };

  const submitExcuse = async () => {
    if (!excuseReason.trim()) return toast.error("Please enter a reason");
    setSubmitting(true);
    try {
      await api.post("/excuse", { sessionId: excuseModal.sessionId, reason: excuseReason });
      toast.success("Excuse submitted! Your lecturer will review it.");
      setExcuseModal(null);
      setExcuseReason("");
      setConfirmExcuse(false);
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit excuse");
    } finally { setSubmitting(false); }
  };

  const filtered = selectedCourse === "all"
    ? sessions
    : sessions.filter(s => String(s.courseId) === selectedCourse);

  return (
    <div className="page">
      <TopBar title="Attendance History" back="/student" showLogout />
      <div className="history-content">

        {/* Course filter */}
        <div className="course-filter animate-fadeUp">
          <button className={`cf-btn ${selectedCourse === "all" ? "active" : ""}`} onClick={() => setSelectedCourse("all")}>All</button>
          {courses.map(c => (
            <button key={c._id} className={`cf-btn ${selectedCourse === c._id ? "active" : ""}`} onClick={() => setSelectedCourse(c._id)}>
              {c.courseCode}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="history-loading"><Loader size={24} className="spin-anim" /></div>
        ) : filtered.length === 0 ? (
          <div className="history-empty"><p>No sessions found</p></div>
        ) : (
          <div className="history-list animate-fadeUp">
            {filtered.map((s, i) => (
              <div key={i} className="history-row">
                <div className="history-left">
                  <div className="history-date">
                    <span className="h-day">{new Date(s.date).toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span className="h-num">{new Date(s.date).getDate()}</span>
                    <span className="h-mon">{new Date(s.date).toLocaleDateString("en-US", { month: "short" })}</span>
                  </div>
                  <div className="history-info">
                    <span className="h-code">{s.courseCode}</span>
                    <span className="h-name">{s.courseName}</span>
                    <span className="h-time">{s.time}</span>
                  </div>
                </div>
                <div className="history-right">
                  <span className={`badge ${statusColor[s.status] || "badge-blue"}`}>
                    {statusIcon[s.status]} {s.status}
                  </span>
                  {s.status === "absent" && s.canExcuse && (
                    <button className="excuse-btn" onClick={() => { setExcuseModal(s); setExcuseReason(""); }}>
                      <FileText size={12} /> Excuse
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Excuse modal */}
      {excuseModal && (
        <div className="modal-overlay" onClick={() => setExcuseModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Excuse</h3>
              <button className="btn-ghost" onClick={() => setExcuseModal(null)}><X size={18} /></button>
            </div>
            <div className="excuse-session-info">
              <span className="h-code">{excuseModal.courseCode}</span>
              <span className="h-time">{new Date(excuseModal.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            </div>
            <div className="input-group">
              <label>Reason for Absence</label>
              <textarea
                className="input-field excuse-textarea"
                placeholder="e.g. I was admitted to the hospital and have a medical report to support this."
                value={excuseReason}
                onChange={e => setExcuseReason(e.target.value)}
                rows={4}
              />
            </div>
            <p className="excuse-note">Your lecturer will review and approve or reject this request.</p>
            <button className="btn btn-primary" onClick={() => setConfirmExcuse(true)} disabled={!excuseReason.trim()}>
              Submit Excuse Request
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmExcuse}
        title="Submit Excuse?"
        body={`Submit an excuse for your absence in ${excuseModal?.courseCode}? This will be reviewed by your lecturer.`}
        confirmLabel="Yes, Submit"
        onConfirm={submitExcuse}
        onCancel={() => setConfirmExcuse(false)}
      />
    </div>
  );
}
