import { useState, useEffect } from "react";
import { Loader, Save } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./AdminPages.css";

export default function PolicyPage() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPolicy(); }, []);

  const fetchPolicy = async () => {
    try { const { data } = await api.get("/admin/policy"); setPolicy(data.policy); }
    catch { toast.error("Failed to load policy"); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try { await api.put("/admin/policy", policy); toast.success("Policy updated!"); }
    catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setPolicy(p => ({ ...p, [k]: v }));

  if (loading) return <div className="page"><TopBar title="Policy" back="/admin"/><div className="admin-loading"><Loader size={24} className="spin-anim"/></div></div>;

  return (
    <div className="page">
      <TopBar title="Attendance Policy" back="/admin" showLogout/>
      <div className="admin-page-content">
        <div className="card animate-fadeUp">
          <div className="policy-form">
            <PolicyRow label="Institution Name" sub="Shown on certificates and reports">
              <input className="input-field" style={{width:180,textAlign:"right"}} value={policy.institutionName||""} onChange={e => set("institutionName", e.target.value)}/>
            </PolicyRow>
            <PolicyRow label="Current Semester" sub="Label for reports and certificates">
              <input className="input-field" style={{width:180,textAlign:"right"}} value={policy.semester||""} onChange={e => set("semester", e.target.value)}/>
            </PolicyRow>
            <PolicyRow label="Global Attendance Threshold" sub="Minimum % before student is flagged at-risk">
              <input className="input-field policy-input" type="number" min={50} max={100} value={policy.globalThreshold||75} onChange={e => set("globalThreshold", parseInt(e.target.value))}/>
            </PolicyRow>
            <PolicyRow label="Late Window (minutes)" sub="How many minutes after session start = late">
              <input className="input-field policy-input" type="number" min={1} max={30} value={policy.lateWindowMinutes||10} onChange={e => set("lateWindowMinutes", parseInt(e.target.value))}/>
            </PolicyRow>
            <PolicyRow label="Max Excuses Per Semester" sub="Per student per course">
              <input className="input-field policy-input" type="number" min={0} max={10} value={policy.maxExcusesPerSemester||3} onChange={e => set("maxExcusesPerSemester", parseInt(e.target.value))}/>
            </PolicyRow>
            <PolicyRow label="Allow QR Check-in">
              <button className={`toggle-switch ${policy.allowQRCheckin?"on":""}`} onClick={() => set("allowQRCheckin", !policy.allowQRCheckin)}/>
            </PolicyRow>
            <PolicyRow label="Allow Location Check-in">
              <button className={`toggle-switch ${policy.allowLocationCheckin?"on":""}`} onClick={() => set("allowLocationCheckin", !policy.allowLocationCheckin)}/>
            </PolicyRow>
            <PolicyRow label="Require Lecturer Approval" sub="Lecturers need admin approval before accessing">
              <button className={`toggle-switch ${policy.requireLecturerApproval?"on":""}`} onClick={() => set("requireLecturerApproval", !policy.requireLecturerApproval)}/>
            </PolicyRow>
          </div>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <span className="auth-spinner"/> : <><Save size={16}/> Save Policy</>}
        </button>
      </div>
    </div>
  );
}

function PolicyRow({ label, sub, children }) {
  return (
    <div className="policy-row">
      <div><div className="policy-label">{label}</div>{sub && <div className="policy-sub">{sub}</div>}</div>
      {children}
    </div>
  );
}
