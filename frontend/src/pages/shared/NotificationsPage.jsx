import { useState, useEffect } from "react";
import { Bell, CheckCircle, AlertTriangle, Clock, Sparkles, Loader } from "lucide-react";
import TopBar from "../../components/shared/TopBar";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./NotificationsPage.css";

const iconMap = {
  checkin: <Bell size={15} color="var(--blue)"/>,
  risk: <AlertTriangle size={15} color="var(--amber)"/>,
  success: <CheckCircle size={15} color="var(--green)"/>,
  reminder: <Clock size={15} color="var(--text-muted)"/>,
  excuse: <Sparkles size={15} color="var(--purple)"/>,
  approval: <CheckCircle size={15} color="var(--green)"/>,
  system: <Bell size={15} color="var(--text-muted)"/>,
};

export default function NotificationsPage({ backPath="/student" }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      // Mark all read
      if (data.unreadCount > 0) await api.put("/notifications/read-all");
    } catch { toast.error("Failed to load notifications"); }
    finally { setLoading(false); }
  };

  return (
    <div className="page">
      <TopBar title="Notifications" back={backPath} showLogout/>
      <div className="notif-content">
        {loading ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px"}}><Loader size={24} className="spin-anim"/></div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <Bell size={40} color="var(--text-muted)"/>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((n,i) => (
            <div key={i} className={`notif-row ${!n.read?"unread":""}`}>
              <div className="notif-icon">{iconMap[n.type]||iconMap.system}</div>
              <div className="notif-body">
                <div className="notif-title">{n.title}</div>
                <div className="notif-text">{n.body}</div>
                <div className="notif-time">{new Date(n.createdAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
              </div>
              {!n.read && <div className="notif-dot"/>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
