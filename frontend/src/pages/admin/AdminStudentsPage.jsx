import { useState, useEffect } from "react";
import { Search, Loader, Trash2 } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import ConfirmModal from "../../components/shared/ConfirmModal";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./AdminPages.css";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    try { const { data } = await api.get("/admin/students"); setStudents(data.students || []); }
    catch { toast.error("Failed to load students"); }
    finally { setLoading(false); }
  };

  const deleteStudent = async (id) => {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("Student removed");
      fetchStudents();
    } catch { toast.error("Failed to delete"); }
    setConfirm(null);
  };

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.matricNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <TopBar title="Students" back="/admin" showLogout />
      <div className="admin-page-content">
        <div className="search-input-wrap animate-fadeUp">
          <Search size={15} color="var(--text-muted)" />
          <input className="search-input" placeholder="Search name, email or matric..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <p className="admin-count animate-fadeUp">{filtered.length} student{filtered.length !== 1 ? "s" : ""}</p>

        {loading ? <div className="admin-loading"><Loader size={24} className="spin-anim" /></div>
        : filtered.length === 0 ? <div className="admin-empty"><p>No students found</p></div>
        : (
          <div className="admin-list animate-fadeUp">
            {filtered.map((s, i) => (
              <div key={i} className="admin-row">
                <div className="ar-avatar">{s.name?.[0]?.toUpperCase() || "S"}</div>
                <div className="ar-info">
                  <div className="ar-name">{s.name}</div>
                  <div className="ar-meta">{s.email}</div>
                  <div className="ar-meta" style={{ fontFamily: "var(--font-mono)" }}>{s.matricNumber || "—"}</div>
                  <div className="ar-meta">{s.department || "No department"}</div>
                </div>
                <button className="action-btn reject" onClick={() => setConfirm({ id: s._id, name: s.name })}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        title="Remove Student?"
        body={`This will permanently delete ${confirm?.name}'s account and all their data.`}
        confirmLabel="Yes, Delete"
        danger
        onConfirm={() => deleteStudent(confirm.id)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
