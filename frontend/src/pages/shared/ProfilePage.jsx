import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Trash2, Download, ChevronRight, CheckCircle, Camera } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import ConfirmModal from "../../components/shared/ConfirmModal";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", department: user?.department || "", bio: user?.bio || "" });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarImage || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword:"", newPassword:"", confirmPassword:"" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const back = user?.role === "lecturer" ? "/lecturer" : user?.role === "admin" ? "/admin" : "/student";

  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase() || "AE";
  const avatarColors = ["#22c55e","#3b82f6","#a855f7","#f59e0b","#ef4444"];
  const avatarColor = avatarColors[user?.name?.charCodeAt(0) % avatarColors.length] || "#22c55e";

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/profile", { ...form, ...(avatarPreview !== user?.avatarImage ? { avatarImage: avatarPreview } : {}) });
      updateUser(data.user);
      setEditing(false);
      toast.success("Profile updated!");
    } catch (err) { toast.error(err.response?.data?.message || "Failed to update"); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 3_000_000) return toast.error("Image too large — please choose one under 3MB");
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = () => { setAvatarPreview(reader.result); setUploadingAvatar(false); };
    reader.onerror = () => { toast.error("Couldn't read that image"); setUploadingAvatar(false); };
    reader.readAsDataURL(file);
  };

  const changePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error("Fill in all fields");
    if (pwForm.newPassword.length < 6) return toast.error("New password must be at least 6 characters");
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error("Passwords don't match");
    setSaving(true);
    try {
      await api.put("/profile/change-password", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success("Password changed!");
      setShowPw(false);
      setPwForm({ currentPassword:"", newPassword:"", confirmPassword:"" });
    } catch (err) { toast.error(err.response?.data?.message || "Failed to change password"); }
    finally { setSaving(false); }
  };

  const deleteAccount = async () => {
    try {
      await api.delete("/profile");
      logout();
      navigate("/");
      toast.success("Account deleted");
    } catch { toast.error("Failed to delete account"); }
  };

  const downloadCertificate = async () => {
    try {
      const { data } = await api.get("/profile/certificate");
      const w = window.open("", "_blank");
      w.document.write(data);
      w.document.close();
      w.print();
    } catch { toast.error("Failed to generate certificate"); }
  };

  return (
    <div className="page">
      <TopBar title="My Profile" back={back} showLogout />
      <div className="profile-content">

        {/* Avatar */}
        <div className="profile-avatar-section animate-fadeUp">
          <div className="profile-avatar-wrap">
            {avatarPreview ? (
              <img className="profile-avatar profile-avatar-img" src={avatarPreview} alt="" />
            ) : (
              <div className="profile-avatar" style={{ background: `${avatarColor}22`, border: `2px solid ${avatarColor}` }}>
                <span style={{ color: avatarColor }}>{initials}</span>
              </div>
            )}
            {editing && (
              <label className="avatar-upload-btn" title="Change photo">
                {uploadingAvatar ? <span className="auth-spinner" style={{width:14,height:14}}/> : <Camera size={14} />}
                <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
              </label>
            )}
          </div>
          <div>
            <h2 className="profile-name">{user?.name}</h2>
            <span className={`badge ${user?.role === "admin" ? "badge-blue" : user?.role === "lecturer" ? "badge-amber" : "badge-green"}`}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Info card */}
        <div className="card animate-fadeUp">
          <div className="profile-section-header">
            <h3>Personal Info</h3>
            {!editing ? (
              <button className="edit-btn" onClick={() => setEditing(true)}>Edit</button>
            ) : (
              <div style={{display:"flex",gap:8}}>
                <button className="edit-btn cancel" onClick={() => setEditing(false)}>Cancel</button>
                <button className="edit-btn save" onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              </div>
            )}
          </div>

          <div className="profile-fields">
            <ProfileField label="Full Name" value={editing ? <input className="input-field" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /> : user?.name} />
            <ProfileField label="Email" value={user?.email} />
            {user?.matricNumber && <ProfileField label="Matric Number" value={user.matricNumber} mono />}
            {user?.staffId && <ProfileField label="Staff ID" value={user.staffId} mono />}
            <ProfileField label="Phone" value={editing ? <input className="input-field" placeholder="e.g. +234 800 000 0000" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /> : (user?.phone || "—")} />
            <ProfileField label="Department" value={editing ? <input className="input-field" placeholder="e.g. Computer Science" value={form.department} onChange={e => setForm(f=>({...f,department:e.target.value}))} /> : (user?.department || "—")} />
            <ProfileField label="Bio" value={editing ? <input className="input-field" placeholder="A short line about yourself" maxLength={200} value={form.bio} onChange={e => setForm(f=>({...f,bio:e.target.value}))} /> : (user?.bio || "—")} />
          </div>
        </div>

        {/* Change password */}
        <div className="card animate-fadeUp">
          <button className="profile-action-row" onClick={() => setShowPw(s=>!s)}>
            <div className="par-left"><Lock size={16} color="var(--text-muted)"/><span>Change Password</span></div>
            <ChevronRight size={16} color="var(--text-muted)" style={{ transform: showPw ? "rotate(90deg)" : "none", transition:"0.2s" }} />
          </button>
          {showPw && (
            <div className="pw-form">
              {["currentPassword","newPassword","confirmPassword"].map((k,i) => (
                <div key={k} className="input-group">
                  <label>{["Current Password","New Password","Confirm New Password"][i]}</label>
                  <input className="input-field" type="password" placeholder="••••••••" value={pwForm[k]} onChange={e => setPwForm(f=>({...f,[k]:e.target.value}))} />
                </div>
              ))}
              <button className="btn btn-primary" onClick={() => setShowPwConfirm(true)} disabled={saving}>
                {saving ? "Changing..." : "Change Password"}
              </button>
            </div>
          )}
        </div>

        {/* Student actions */}
        {user?.role === "student" && (
          <button className="card profile-action-row" onClick={downloadCertificate}>
            <div className="par-left"><Download size={16} color="var(--green)"/><span style={{color:"var(--green)"}}>Download Attendance Certificate</span></div>
            <ChevronRight size={16} color="var(--green)"/>
          </button>
        )}

        {/* Face verification - coming soon */}
        <div className="card profile-action-row" style={{opacity:0.6,cursor:"not-allowed"}}>
          <div className="par-left"><Camera size={16} color="var(--text-muted)"/><span>Face Verification</span></div>
          <span className="coming-soon-pill">Soon</span>
        </div>

        {/* Delete account */}
        <button className="card profile-action-row danger" onClick={() => setShowDeleteConfirm(true)}>
          <div className="par-left"><Trash2 size={16} color="var(--red)"/><span style={{color:"var(--red)"}}>Delete Account</span></div>
          <ChevronRight size={16} color="var(--red)"/>
        </button>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Account?"
        body="This will permanently delete your account and all your data. This cannot be undone."
        confirmLabel="Yes, Delete Account"
        danger
        onConfirm={deleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        open={showPwConfirm}
        title="Change Password?"
        body="Are you sure you want to change your password? You'll continue to be logged in."
        confirmLabel="Yes, Change It"
        onConfirm={() => { setShowPwConfirm(false); changePassword(); }}
        onCancel={() => setShowPwConfirm(false)}
      />
    </div>
  );
}

function ProfileField({ label, value, mono }) {
  return (
    <div className="profile-field">
      <span className="pf-label">{label}</span>
      <div className={`pf-value ${mono ? "mono" : ""}`}>{value}</div>
    </div>
  );
}
