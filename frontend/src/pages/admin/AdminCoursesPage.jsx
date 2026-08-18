import { useState, useEffect } from "react";
import { Search, Loader, BookOpen, Users } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./AdminPages.css";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try { const { data } = await api.get("/admin/courses"); setCourses(data.courses || []); }
    catch { toast.error("Failed to load courses"); }
    finally { setLoading(false); }
  };

  const filtered = courses.filter(c =>
    c.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
    c.courseName?.toLowerCase().includes(search.toLowerCase()) ||
    c.lecturer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <TopBar title="All Courses" back="/admin" showLogout />
      <div className="admin-page-content">
        <div className="search-input-wrap animate-fadeUp">
          <Search size={15} color="var(--text-muted)" />
          <input className="search-input" placeholder="Search course or lecturer..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <p className="admin-count animate-fadeUp">{filtered.length} course{filtered.length !== 1 ? "s" : ""}</p>

        {loading ? <div className="admin-loading"><Loader size={24} className="spin-anim" /></div>
        : filtered.length === 0 ? <div className="admin-empty"><p>No courses found</p></div>
        : (
          <div className="admin-list animate-fadeUp">
            {filtered.map((c, i) => (
              <div key={i} className="admin-row">
                <div className="ar-avatar" style={{ background: "rgba(168,85,247,0.1)", color: "var(--purple)", borderRadius: "var(--radius-sm)" }}>
                  <BookOpen size={18} />
                </div>
                <div className="ar-info">
                  <div className="ar-name">{c.courseCode} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>— {c.courseName}</span></div>
                  <div className="ar-meta">👨‍🏫 {c.lecturer?.name || "Unassigned"}</div>
                  <div className="ar-meta">{c.department || "No department"}</div>
                </div>
                <div className="ar-actions">
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    <Users size={13} /> {c.students?.length || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
