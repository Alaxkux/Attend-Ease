import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, Download, Search, Loader, ChevronDown, ChevronUp } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import StatRing from "../../components/shared/StatRing";
import { detectPattern } from "../../utils/patterns";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./ReportsPage.css";

export default function ReportsPage() {
  const { courseId } = useParams();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | at-risk | absent | late

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await api.get("/lecturer/courses");
      setCourses(data.courses || []);
      const target = courseId ? data.courses?.find(c => c._id === courseId) : data.courses?.[0];
      if (target) {
        setSelectedCourse(target);
        fetchStudents(target._id);
      }
    } catch { toast.error("Failed to load courses"); }
    finally { setLoading(false); }
  };

  const fetchStudents = async (courseId) => {
    setLoadingStudents(true);
    try {
      const { data } = await api.get(`/lecturer/course/${courseId}/report`);
      setStudents(data.students || []);
    } catch { toast.error("Failed to load student data"); }
    finally { setLoadingStudents(false); }
  };

  const selectCourse = (course) => {
    setSelectedCourse(course);
    fetchStudents(course._id);
  };

  const exportCSV = async () => {
    if (!selectedCourse) return;
    try {
      const { data } = await api.get(`/lecturer/course/${selectedCourse._id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${selectedCourse.courseCode}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported!");
    } catch { toast.error("Export failed"); }
  };

  const filtered = students
    .filter(s => {
      const q = search.toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.matricNumber?.toLowerCase().includes(q);
    })
    .filter(s => {
      const p = detectPattern(s.history || []);
      if (filter === "at-risk") return p.atRisk;
      if (filter === "absent") return p.label === "Often Absent";
      if (filter === "late") return p.label === "Frequently Late";
      return true;
    });

  const atRiskCount = students.filter(s => detectPattern(s.history || []).atRisk).length;

  return (
    <div className="page">
      <TopBar title="Reports" back="/lecturer" showLogout
        actions={
          <button className="export-btn-top" onClick={exportCSV} disabled={!selectedCourse}>
            <Download size={15} /> Export
          </button>
        }
      />

      <div className="reports-content">
        {/* Course selector */}
        {courses.length > 1 && (
          <div className="course-selector animate-fadeUp">
            {courses.map(c => (
              <button
                key={c._id}
                className={`course-select-btn ${selectedCourse?._id === c._id ? "active" : ""}`}
                onClick={() => selectCourse(c)}
              >
                {c.courseCode}
              </button>
            ))}
          </div>
        )}

        {/* At-risk alert */}
        {atRiskCount > 0 && (
          <div className="at-risk-alert animate-fadeUp">
            <AlertTriangle size={18} color="var(--amber)" />
            <div>
              <strong>{atRiskCount} student{atRiskCount > 1 ? "s" : ""} at risk</strong>
              <p>Below 75% attendance threshold</p>
            </div>
            <button className="filter-risk-btn" onClick={() => setFilter(f => f === "at-risk" ? "all" : "at-risk")}>
              {filter === "at-risk" ? "Show all" : "View"}
            </button>
          </div>
        )}

        {/* Search + filter */}
        <div className="search-filter-row animate-fadeUp">
          <div className="search-input-wrap">
            <Search size={15} color="var(--text-muted)" />
            <input
              className="search-input"
              placeholder="Search student or matric..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-chips">
            {["all", "at-risk", "absent", "late"].map(f => (
              <button
                key={f}
                className={`filter-chip ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f === "at-risk" ? "⚠️ At Risk" : f === "absent" ? "Absent" : "Late"}
              </button>
            ))}
          </div>
        </div>

        {/* Students list */}
        {loadingStudents ? (
          <div className="reports-loading"><Loader size={24} className="spin-anim" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "40px 20px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>No students match this filter</p>
          </div>
        ) : (
          <div className="students-report-list animate-fadeUp">
            {filtered.map((s, i) => {
              const pattern = detectPattern(s.history || []);
              return (
                <StudentReportRow key={i} student={s} pattern={pattern} />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentReportRow({ student, pattern }) {
  const [expanded, setExpanded] = useState(false);

  const colorMap = { green: "var(--green)", amber: "var(--amber)", red: "var(--red)", muted: "var(--text-muted)" };
  const color = colorMap[pattern.color] || "var(--text-muted)";

  return (
    <div className={`student-report-row ${pattern.atRisk ? "at-risk" : ""}`}>
      <div className="srr-main" onClick={() => setExpanded(e => !e)}>
        <div className="srr-avatar" style={{ background: `${color}18`, color }}>
          {student.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="srr-info">
          <div className="srr-name">
            {student.name}
            {pattern.atRisk && <span className="risk-mini-badge"><AlertTriangle size={10} /></span>}
          </div>
          <div className="srr-matric">{student.matricNumber}</div>
          <div className="srr-pattern" style={{ color }}>
            {pattern.emoji} {pattern.label}
          </div>
        </div>
        <div className="srr-ring">
          <StatRing value={pattern.attendanceRate} size={56} stroke={5} color={color} />
        </div>
        <button className="srr-expand">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="srr-expanded animate-fadeIn">
          <div className="srr-stats">
            <div className="srr-stat">
              <span style={{ color: "var(--green)" }}>{pattern.pct.present}%</span>
              <span>Present</span>
            </div>
            <div className="srr-stat">
              <span style={{ color: "var(--amber)" }}>{pattern.pct.late}%</span>
              <span>Late</span>
            </div>
            <div className="srr-stat">
              <span style={{ color: "var(--red)" }}>{pattern.pct.absent}%</span>
              <span>Absent</span>
            </div>
            <div className="srr-stat">
              <span style={{ color: "var(--text-primary)" }}>{pattern.streak}</span>
              <span>Streak</span>
            </div>
          </div>
          <div className="srr-history">
            {(student.history || []).slice(-14).map((h, i) => (
              <div
                key={i}
                className="history-dot"
                style={{
                  background: h === "present" ? "var(--green)" : h === "late" ? "var(--amber)" : "var(--red)",
                  opacity: h === "absent" ? 0.5 : 1,
                }}
                title={h}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
