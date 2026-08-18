import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QrCode, MapPin, CheckCircle, XCircle, Clock, Loader } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import { getCurrentPosition, isWithinZone } from "../../utils/geo";
import { queueCheckin, flushQueue } from "../../utils/offlineQueue";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./AttendPage.css";

const QR_REFRESH = 30; // seconds

export default function AttendPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("qr"); // qr | location
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState(null);
  const [countdown, setCountdown] = useState(QR_REFRESH);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | checking | within | outside | error
  const [locationInfo, setLocationInfo] = useState(null);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const qrIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    fetchSession();
    return () => {
      clearInterval(qrIntervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [courseId]);

  const fetchSession = async () => {
    try {
      const { data } = await api.get(`/student/session/${courseId}`);
      setSession(data.session);
      setMarked(data.alreadyMarked);
      checkWindow(data.session);
      if (!data.alreadyMarked) {
        fetchQR();
        startQRRefresh();
        startWindowTimer(data.session);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  const checkWindow = (sess) => {
    if (!sess) return;
    const now = new Date();
    const open = new Date(sess.windowStart);
    const close = new Date(sess.windowEnd);
    setWindowOpen(now >= open && now <= close);
  };

  const startWindowTimer = (sess) => {
    if (!sess) return;
    const tick = () => {
      const now = new Date();
      const close = new Date(sess.windowEnd);
      const open = new Date(sess.windowStart);
      if (now < open) {
        const diff = Math.ceil((open - now) / 1000);
        setTimeLeft(`Opens in ${formatSecs(diff)}`);
        setWindowOpen(false);
      } else if (now <= close) {
        const diff = Math.ceil((close - now) / 1000);
        setTimeLeft(`Closes in ${formatSecs(diff)}`);
        setWindowOpen(true);
      } else {
        setTimeLeft("Window closed");
        setWindowOpen(false);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  };

  const fetchQR = async () => {
    try {
      const { data } = await api.get(`/student/session/${courseId}/qr`);
      setQrData(data.qrUrl);
      setCountdown(QR_REFRESH);
    } catch {/* silent */}
  };

  const startQRRefresh = () => {
    clearInterval(qrIntervalRef.current);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchQR(); return QR_REFRESH; }
        return c - 1;
      });
    }, 1000);
  };

  const handleQRCheckin = async () => {
    if (!windowOpen) return toast.error("Check-in window is not open");
    setMarking(true);
    try {
      const { data: ciData } = await api.post(`/student/checkin/${courseId}`, { method: "qr" });
      setMarked(true);
      setTimeout(() => navigate("/student/checkin-success", {
        state: { status: ciData.status, courseCode: session?.courseCode, courseName: session?.courseName }
      }), 400);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark attendance");
    } finally {
      setMarking(false);
    }
  };

  const handleLocationCheckin = useCallback(async () => {
    if (!windowOpen) return toast.error("Check-in window is not open");
    setLocationStatus("checking");
    try {
      const pos = await getCurrentPosition();
      const { latitude: uLat, longitude: uLon } = pos.coords;
      const { within, distance } = isWithinZone(
        uLat, uLon,
        session.locationLat, session.locationLon,
        session.geofenceRadius || 50
      );
      setLocationInfo({ distance, within });

      if (!within) {
        setLocationStatus("outside");
        return toast.error(`You are ${distance}m away from the classroom`);
      }
      setLocationStatus("within");

      // Online
      if (navigator.onLine) {
        setMarking(true);
        const { data: ciData } = await api.post(`/student/checkin/${courseId}`, { method: "location", lat: uLat, lon: uLon });
        setMarked(true);
        setTimeout(() => navigate("/student/checkin-success", {
          state: { status: ciData.status, courseCode: session?.courseCode, courseName: session?.courseName }
        }), 400);
      } else {
        // Offline — queue it
        await queueCheckin({ courseId, method: "location", lat: uLat, lon: uLon, sessionId: session._id });
        toast.success("Saved offline. Will sync when connected.", { duration: 4000 });
        setMarked(true);
      }
    } catch (err) {
      setLocationStatus("error");
      toast.error(err.message || "Could not get your location");
    } finally {
      setMarking(false);
    }
  }, [session, windowOpen, courseId, navigate]);

  // Flush offline queue when online
  useEffect(() => {
    const flush = async () => {
      await flushQueue(async (item) => {
        await api.post(`/student/checkin/${item.courseId}`, { method: item.method, lat: item.lat, lon: item.lon });
      });
    };
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);

  if (loading) return (
    <div className="page">
      <TopBar title="Attendance" back="/student" />
      <div className="attend-loading"><Loader size={28} className="spin-anim" /></div>
    </div>
  );

  if (!session) return (
    <div className="page">
      <TopBar title="Attendance" back="/student" />
      <div className="attend-loading">
        <XCircle size={40} color="var(--red)" />
        <p>No active session found</p>
      </div>
    </div>
  );

  return (
    <div className="page">
      <TopBar title="Mark Attendance" back="/student" />

      <div className="attend-content">
        {/* Session info */}
        <div className="session-info card animate-fadeUp">
          <div className="session-header">
            <div>
              <h2 className="session-code">{session.courseCode}</h2>
              <p className="session-name">{session.courseName}</p>
            </div>
            <div className={`window-badge ${windowOpen ? "open" : "closed"}`}>
              <Clock size={12} />
              {windowOpen ? "Window Open" : "Closed"}
            </div>
          </div>
          <div className="session-meta">
            <span>👨‍🏫 {session.lecturer}</span>
            <span>🕐 {timeLeft}</span>
          </div>
        </div>

        {marked ? (
          <div className="marked-state animate-fadeUp">
            <CheckCircle size={64} color="var(--green)" />
            <h3>Attendance Confirmed!</h3>
            <p>Your attendance has been recorded for this session.</p>
          </div>
        ) : !windowOpen ? (
          <div className="window-closed-state animate-fadeUp">
            <Clock size={48} color="var(--text-muted)" />
            <h3>Window Not Open</h3>
            <p>{timeLeft}</p>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="method-tabs animate-fadeUp">
              <button className={`method-tab ${tab === "qr" ? "active" : ""}`} onClick={() => setTab("qr")}>
                <QrCode size={16} /> QR Code
              </button>
              <button className={`method-tab ${tab === "location" ? "active" : ""}`} onClick={() => setTab("location")}>
                <MapPin size={16} /> Location
              </button>
            </div>

            {/* QR tab */}
            {tab === "qr" && (
              <div className="qr-panel animate-fadeUp">
                <p className="qr-hint">Scan this QR code to mark your attendance</p>
                <div className="qr-box">
                  {qrData ? (
                    <img src={qrData} alt="QR Code" className="qr-image" />
                  ) : (
                    <div className="qr-placeholder"><Loader size={24} className="spin-anim" /></div>
                  )}
                  <div className="qr-corners">
                    <span /><span /><span /><span />
                  </div>
                </div>
                <div className="qr-timer">
                  <Clock size={13} />
                  Refreshes in <strong style={{ fontFamily: "var(--font-mono)" }}>{countdown}s</strong>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleQRCheckin}
                  disabled={marking}
                >
                  {marking ? <span className="auth-spinner" /> : <><CheckCircle size={18} /> Confirm Attendance</>}
                </button>
              </div>
            )}

            {/* Location tab */}
            {tab === "location" && (
              <div className="location-panel animate-fadeUp">
                <div className={`location-map-visual ${locationStatus}`}>
                  <div className="classroom-grid">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="seat-dot" />
                    ))}
                  </div>
                  <div className={`location-pin ${locationStatus === "within" ? "active" : ""}`}>
                    <MapPin size={24} />
                  </div>
                </div>

                <div className="location-status-text">
                  {locationStatus === "idle" && <p>Tap below to check your location</p>}
                  {locationStatus === "checking" && <p className="checking">Locating you...</p>}
                  {locationStatus === "within" && (
                    <p className="within">✅ You are within the attendance zone ({locationInfo?.distance}m away)</p>
                  )}
                  {locationStatus === "outside" && (
                    <p className="outside">❌ You are {locationInfo?.distance}m away — must be within {session.geofenceRadius || 50}m</p>
                  )}
                  {locationStatus === "error" && <p className="outside">Could not determine your location</p>}
                </div>

                <button
                  className={`btn ${locationStatus === "within" ? "btn-primary" : "btn-secondary"}`}
                  onClick={handleLocationCheckin}
                  disabled={marking || locationStatus === "checking"}
                >
                  {marking ? <span className="auth-spinner" /> : locationStatus === "within"
                    ? <><CheckCircle size={18} /> Confirm Attendance</>
                    : <><MapPin size={18} /> Check My Location</>
                  }
                </button>
              </div>
            )}
          </>
        )}

        {/* Live map — coming soon (separate from the geofence check above) */}
        <div className="card profile-action-row" style={{opacity:0.6,cursor:"not-allowed"}}>
          <div className="par-left"><MapPin size={16} color="var(--text-muted)"/><span>View live map of your location</span></div>
          <span className="coming-soon-pill">Soon</span>
        </div>

        {/* Smart Insights teaser */}
        <button className="insights-teaser animate-fadeUp" onClick={() => navigate("/student/insights")}>
          <span>📊</span>
          <div>
            <strong>View your attendance insights</strong>
            <p>See your patterns and AI-powered analysis</p>
          </div>
          <span className="arrow">›</span>
        </button>
      </div>
    </div>
  );
}

function formatSecs(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
