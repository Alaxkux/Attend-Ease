import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, Search, Loader } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import ConfirmModal from "../../components/shared/ConfirmModal";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./AdminPages.css";

export default function LecturersPage() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchLecturers(); }, []);

  const fetchLecturers = async () => {
    try { const { data } = await api.get("/admin/lecturers"); setLecturers(data.lecturers||[]); }
    catch { toast.error("Failed to load lecturers"); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id, approved) => {
    try {
      await api.put(`/admin/lecturers/${id}/approve`, { approved });
      toast.success(approved ? "Lecturer approved!" : "Lecturer rejected");
      fetchLecturers();
    } catch { toast.error("Action failed"); }
    setConfirm(null);
  };

  const filtered = lecturers
    .filter(l => l.name?.toLowerCase().includes(search.toLowerCase()) || l.email?.toLowerCase().includes(search.toLowerCase()))
    .filter(l => filter === "all" ? true : filter === "pending" ? (l.isVerified && !l.isApproved) : l.isApproved);

  return (
    <div className="page">
      <TopBar title="Lecturers" back="/admin" showLogout />
      <div className="admin-page-content">
        <div className="search-filter-row animate-fadeUp">
          <div className="search-input-wrap">
            <Search size={15} color="var(--text-muted)"/>
            <input className="search-input" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div className="filter-chips">
            {["all","pending","approved"].map(f => (
              <button key={f} className={`filter-chip ${filter===f?"active":""}`} onClick={() => setFilter(f)}>
                {f==="all"?"All":f==="pending"?"⏳ Pending":"✅ Approved"}
              </button>
            ))}
          </div>
        </div>

        {loading ? <div className="admin-loading"><Loader size={24} className="spin-anim"/></div>
        : filtered.length === 0 ? <div className="admin-empty"><p>No lecturers found</p></div>
        : (
          <div className="admin-list animate-fadeUp">
            {filtered.map((l,i) => (
              <div key={i} className="admin-row">
                <div className="ar-avatar">{l.name?.[0]?.toUpperCase()||"L"}</div>
                <div className="ar-info">
                  <div className="ar-name">{l.name}</div>
                  <div className="ar-meta">{l.email} · {l.staffId || "—"}</div>
                  <div className="ar-meta">{l.department || "No department"}</div>
                </div>
                <div className="ar-actions">
                  {!l.isVerified ? (
                    <span className="badge" style={{background:"var(--bg-elevated)",color:"var(--text-muted)"}}>Unverified</span>
                  ) : l.isApproved ? (
                    <span className="badge badge-green"><CheckCircle size={10}/> Approved</span>
                  ) : (
                    <div style={{display:"flex",gap:6}}>
                      <button className="action-btn approve" onClick={() => setConfirm({id:l._id,approved:true,name:l.name})}>
                        <CheckCircle size={14}/> Approve
                      </button>
                      <button className="action-btn reject" onClick={() => setConfirm({id:l._id,approved:false,name:l.name})}>
                        <XCircle size={14}/> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.approved ? "Approve Lecturer?" : "Reject Lecturer?"}
        body={confirm?.approved
          ? `${confirm?.name} will be able to log in and create courses.`
          : `${confirm?.name}'s account will be rejected. They will be notified.`}
        confirmLabel={confirm?.approved ? "Yes, Approve" : "Yes, Reject"}
        danger={!confirm?.approved}
        onConfirm={() => handleApprove(confirm.id, confirm.approved)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
