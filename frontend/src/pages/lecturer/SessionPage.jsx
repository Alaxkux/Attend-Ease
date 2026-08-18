import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Download, Clock, MapPin, QrCode, AlertTriangle, CheckCircle, XCircle, Loader } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import ConfirmModal from "../../components/shared/ConfirmModal";
import api from "../../utils/api";
import { getCurrentPosition } from "../../utils/geo";
import toast from "react-hot-toast";
import "./SessionPage.css";

export default function SessionPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [session, setSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);
  const [windowMins, setWindowMins] = useState(30);
  const [timeLeft, setTimeLeft] = useState("");
  const [locating, setLocating] = useState(false);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchCourse();
    return () => { clearInterval(pollRef.current); clearInterval(timerRef.current); };
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const { data } = await api.get(`/lecturer/course/${courseId}`);
      setCourse(data.course);
      setStudents(data.students || []);
      if (data.activeSession) {
        setSession(data.activeSession);
        setAttendees(data.activeSession.attendees || []);
        startPolling(data.activeSession._id);
        startTimer(data.activeSession.windowEnd);
        fetchQR(data.activeSession._id);
      }
    } catch { toast.error("Failed to load course"); }
    finally { setLoading(false); }
  };

  const startSession = async () => {
    if (!windowMins || windowMins < 1) return toast.error("Set a check-in window (in minutes) first");
    setStarting(true);
    setLocating(true);
    try {
      let locationData = {};
      try {
        const pos = await getCurrentPosition();
        locationData = { locationLat: pos.coords.latitude, locationLon: pos.coords.longitude };
        toast.success("Location captured ✅");
      } catch {
        toast("Location unavailable — QR only", { icon: "⚠️" });
      }
      setLocating(false);

      const { data } = await api.post(`/lecturer/session/start`, {
        courseId,
        windowMinutes: windowMins,
        ...locationData,
      });

      setSession(data.session);
      setQrUrl(data.qrUrl);
      fetchQR(data.session._id);
      startPolling(data.session._id);
      startTimer(data.session.windowEnd);
      toast.success("Session started!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start session");
    } finally { setStarting(false); setLocating(false); }
  };

  const fetchQR = async (sessionId) => {
    try {
      const { data } = await api.get(`/lecturer/session/${sessionId}/qr`);
      setQrUrl(data.qrUrl);
    } catch {/* silent */}
  };

  const startPolling = (sessionId) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/lecturer/session/${sessionId}/attendees`);
        setAttendees(data.attendees || []);
      } catch {/* silent */}
    }, 5000);
  };

  const startTimer = (windowEnd) => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const diff = Math.ceil((new Date(windowEnd) - new Date()) / 1000);
      if (diff <= 0) {
        setTimeLeft("Session closed");
        clearInterval(timerRef.current);
        clearInterval(pollRef.current);
      } else {
        const m = Math.floor(diff / 60), s = diff % 60;
        setTimeLeft(`${m}:${String(s).padStart(2, "0")} remaining`);
      }
    }, 1000);
  };

  const endSession = async () => {
    try {
      await api.post(`/lecturer/session/${session._id}/end`);
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
      setSession(null);
      setQrUrl(null);
      toast.success("Session ended");
      fetchCourse();
    } catch { toast.error("Failed to end session"); }
  };

  const exportCSV = async () => {
    try {
      const { data } = await api.get(`/lecturer/session/${session._id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${course?.courseCode}-${new Date().toLocaleDateString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded!");
    } catch { toast.error("Export failed"); }
  };

  const markedIds = new Set(attendees.map(a => a.studentId));
  const absentStudents = students.filter(s => !markedIds.has(s._id));

  if (loading) return (
    <div className="page">
      <TopBar title="Session" back="/lecturer" />
      <div className="session-loading"><Loader size={28} className="spin-anim" /></div>
    </div>
  );

  return (
    <div className="page">
      <TopBar title={course?.courseCode || "Session"} back="/lecturer" showLogout />

      <div className="session-content">
        {/* Course info */}
        <div className="session-course-info card animate-fadeUp">
          <h2 className="session-course-code">{course?.courseCode}</h2>
          <p className="session-course-name">{course?.courseName}</p>
          <div className="session-course-meta">
            <span><Users size={12} /> {students.length} enrolled</span>
            {session && <span className="session-timer-pill"><Clock size={12} /> {timeLeft}</span>}
          </div>
        </div>

        {!session ? (
          /* Start session panel */
          <div className="start-session-panel card animate-fadeUp">
            <h3>Start New Session</h3>
            <p className="start-hint">Your location will be used as the geofence center for location check-ins.</p>

            <div className="input-group">
              <label>Check-in Window (minutes)</label>
              <div className="window-options">
                {[15, 20, 30, 45].map(m => (
                  <button
                    key={m}
                    className={`window-opt ${windowMins === m ? "active" : ""}`}
                    onClick={() => setWindowMins(m)}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <div className="window-custom">
                <span>Custom:</span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  className="input-field window-custom-input"
                  placeholder="e.g. 25"
                  value={[15,20,30,45].includes(windowMins) ? "" : windowMins}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    if (!e.target.value) return setWindowMins("");
                    if (!isNaN(v)) setWindowMins(Math.min(180, Math.max(1, v)));
                  }}
                />
                <span>min</span>
              </div>
            </div>

            <div className="start-features">
              <div className="feature-pill"><QrCode size={13} /> QR Check-in</div>
              <div className="feature-pill"><MapPin size={13} /> Location Check-in</div>
            </div>

            <div className="card profile-action-row" style={{opacity:0.6,cursor:"not-allowed",marginTop:4}}>
              <div className="par-left"><MapPin size={16} color="var(--text-muted)"/><span>View live map of student locations</span></div>
              <span className="coming-soon-pill">Soon</span>
            </div>

            <button className="btn btn-primary" onClick={startSession} disabled={starting}>
              {starting ? (
                <>{locating ? <><span className="auth-spinner" /> Capturing location...</> : <><span className="auth-spinner" /> Starting...</>}</>
              ) : "Start Session"}
            </button>
          </div>
        ) : (
          <>
            {/* QR display */}
            <div className="session-qr-card card animate-fadeUp">
              <div className="session-qr-header">
                <div>
                  <h3>Live QR Code</h3>
                  <p>Refreshes every 30 seconds</p>
                </div>
                <button className="export-btn" onClick={exportCSV}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
              <div className="session-qr-display">
                {qrUrl ? (
                  <img src={qrUrl} alt="QR" className="session-qr-img" />
                ) : (
                  <div className="session-qr-placeholder"><Loader size={24} className="spin-anim" /></div>
                )}
              </div>
              <div className="session-attendance-count">
                <CheckCircle size={15} color="var(--green)" />
                <strong>{attendees.length}</strong> of <strong>{students.length}</strong> marked
              </div>
              <button className="btn btn-danger" onClick={() => setShowEndConfirm(true)} style={{ marginTop: 4 }}>
                End Session
              </button>
            </div>

            {/* Attendees list */}
            <div className="attendees-section animate-fadeUp">
              <h3 className="section-title">Attendance ({attendees.length})</h3>
              <div className="attendees-list">
                {attendees.map((a, i) => (
                  <div key={i} className="attendee-row present">
                    <div className="attendee-avatar">{a.studentName?.[0] || "?"}</div>
                    <div className="attendee-info">
                      <span className="attendee-name">{a.studentName}</span>
                      <span className="attendee-meta">{a.matricNumber} · {a.method === "qr" ? "📲 QR" : "📍 Location"}</span>
                    </div>
                    <span className={`badge ${a.status === "present" ? "badge-green" : "badge-amber"}`}>
                      {a.status}
                    </span>
                  </div>
                ))}

                {absentStudents.length > 0 && (
                  <>
                    <div className="attendees-divider">Absent ({absentStudents.length})</div>
                    {absentStudents.map((s, i) => (
                      <div key={i} className="attendee-row absent">
                        <div className="attendee-avatar absent-av">{s.name?.[0] || "?"}</div>
                        <div className="attendee-info">
                          <span className="attendee-name">{s.name}</span>
                          <span className="attendee-meta">{s.matricNumber}</span>
                        </div>
                        <span className="badge badge-red">Absent</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Past sessions */}
        <button className="view-history-btn" onClick={() => navigate(`/lecturer/sessions?course=${courseId}`)}>
          <Clock size={14} /> View Session History
        </button>
      </div>

      <ConfirmModal
        open={showEndConfirm}
        title="End this session?"
        body="Students won't be able to check in once this session ends. This can't be undone."
        confirmLabel="Yes, End Session"
        danger
        onConfirm={() => { setShowEndConfirm(false); endSession(); }}
        onCancel={() => setShowEndConfirm(false)}
      />
    </div>
  );
}
