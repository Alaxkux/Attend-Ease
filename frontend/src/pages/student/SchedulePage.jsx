import { useState, useEffect } from "react";
import { Clock, BookOpen, Loader } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./SchedulePage.css";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function SchedulePage() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(() => {
    const d = new Date().getDay();
    return DAYS[d === 0 ? 0 : d - 1] || "Monday";
  });

  useEffect(() => { fetchSchedule(); }, []);

  const fetchSchedule = async () => {
    try {
      const { data } = await api.get("/student/schedule");
      setSchedule(data.schedule || []);
    } catch { toast.error("Failed to load schedule"); }
    finally { setLoading(false); }
  };

  const daySchedule = schedule.filter(s => s.day === activeDay).sort((a, b) => a.startTime?.localeCompare(b.startTime));

  return (
    <div className="page">
      <TopBar title="Timetable" back="/student" showLogout />
      <div className="schedule-content">

        {/* Day tabs */}
        <div className="day-tabs animate-fadeUp">
          {DAYS.map(d => (
            <button key={d} className={`day-tab ${activeDay === d ? "active" : ""}`} onClick={() => setActiveDay(d)}>
              {d.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="day-label animate-fadeUp">{activeDay}</div>

        {loading ? (
          <div className="schedule-loading"><Loader size={24} className="spin-anim" /></div>
        ) : daySchedule.length === 0 ? (
          <div className="schedule-empty">
            <BookOpen size={40} color="var(--text-muted)" />
            <p>No classes on {activeDay}</p>
          </div>
        ) : (
          <div className="schedule-list animate-fadeUp">
            {daySchedule.map((s, i) => (
              <div key={i} className="schedule-row">
                <div className="schedule-time-col">
                  <span className="sched-start">{formatTime(s.startTime)}</span>
                  <div className="sched-line" />
                  <span className="sched-end">{formatTime(s.endTime)}</span>
                </div>
                <div className="schedule-card">
                  <div className="sched-code">{s.courseCode}</div>
                  <div className="sched-name">{s.courseName}</div>
                  <div className="sched-meta">
                    <Clock size={11} /> {s.startTime} – {s.endTime}
                  </div>
                  <div className="sched-meta">👨‍🏫 {s.lecturer}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {schedule.length === 0 && !loading && (
          <div className="schedule-hint">
            <p>No timetable set up yet. Your lecturers need to add a schedule to their courses.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}
