import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Loader, Clock } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import ConfirmModal from "../../components/shared/ConfirmModal";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./AdminPages.css";

export default function ExcusesPage() {
  const [excuses, setExcuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [confirm, setConfirm] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => { fetchExcuses(); }, []);

  const fetchExcuses = async () => {
    try {
      // Get all courses first then fetch excuses per course
      const { data: cData } = await api.get("/lecturer/courses");
      const all = [];
      for (const c of cData.courses || []) {
        const { data } = await api.get(`/excuse/course/${c._id}`);
        all.push(...(data.excuses || []));
      }
      setExcuses(all);
    } catch { toast.error("Failed to load excuses"); }
    finally { setLoading(false); }
  };

  const handleReview = async (id, status) => {
    try {
      await api.put(`/excuse/${id}/review`, { status, reviewNote: note });
      toast.success(`Excuse ${status}`);
      fetchExcuses();
    } catch { toast.error("Action failed"); }
    setConfirm(null); setNote("");
  };

  const filtered = excuses.filter(e => filter === "all" ? true : e.status === filter);

  return (
    <div className="page">
      <TopBar title="Excuse Requests" back="/admin" showLogout/>
      <div className="admin-page-content">
        <div className="filter-chips animate-fadeUp">
          {["pending","approved","rejected","all"].map(f => (
            <button key={f} className={`filter-chip ${filter===f?"active":""}`} onClick={() => setFilter(f)}>
              {f==="pending"?"⏳ Pending":f==="approved"?"✅ Approved":f==="rejected"?"❌ Rejected":"All"}
            </button>
          ))}
        </div>

        {loading ? <div className="admin-loading"><Loader size={24} className="spin-anim"/></div>
        : filtered.length===0 ? <div className="admin-empty"><p>No {filter} excuse requests</p></div>
        : (
          <div className="admin-list animate-fadeUp">
            {filtered.map((e,i) => (
              <div key={i} className="admin-row" style={{flexDirection:"column",alignItems:"stretch",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div className="ar-avatar">{e.studentName?.[0]||"S"}</div>
                  <div className="ar-info">
                    <div className="ar-name">{e.studentName} <span style={{fontWeight:400,color:"var(--text-muted)"}}>({e.matricNumber})</span></div>
                    <div className="ar-meta">{e.courseCode} · {new Date(e.createdAt).toLocaleDateString()}</div>
                    <div className={`ar-meta excuse-status-${e.status}`}>{e.status.toUpperCase()}</div>
                  </div>
                </div>
                <div style={{background:"var(--bg-elevated)",borderRadius:8,padding:"10px 12px",fontSize:"0.82rem",color:"var(--text-secondary)",lineHeight:1.5}}>
                  {e.reason}
                </div>
                {e.status === "pending" && (
                  <div style={{display:"flex",gap:8}}>
                    <button className="action-btn approve" style={{flex:1,justifyContent:"center"}} onClick={() => setConfirm({id:e._id,status:"approved",name:e.studentName})}>
                      <CheckCircle size={14}/> Approve
                    </button>
                    <button className="action-btn reject" style={{flex:1,justifyContent:"center"}} onClick={() => setConfirm({id:e._id,status:"rejected",name:e.studentName})}>
                      <XCircle size={14}/> Reject
                    </button>
                  </div>
                )}
                {e.reviewNote && <div style={{fontSize:"0.75rem",color:"var(--text-muted)"}}>Note: {e.reviewNote}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.status==="approved" ? "Approve Excuse?" : "Reject Excuse?"}
        body={`${confirm?.status==="approved" ? "This will mark the student as excused for the session." : "The student will be notified of the rejection."}`}
        confirmLabel={confirm?.status==="approved" ? "Yes, Approve" : "Yes, Reject"}
        danger={confirm?.status==="rejected"}
        onConfirm={() => handleReview(confirm.id, confirm.status)}
        onCancel={() => { setConfirm(null); setNote(""); }}
      />
    </div>
  );
}
