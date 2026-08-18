import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import api from "../../utils/api";
import "./NotificationBell.css";

export default function NotificationBell({ to }) {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnread = async () => {
    try {
      const { data } = await api.get("/notifications");
      setUnread(data.unreadCount || 0);
    } catch { /* silent — non-critical */ }
  };

  return (
    <button className="topbar-icon-btn notif-bell-btn" onClick={() => navigate(to)} title="Notifications">
      <Bell size={18} />
      {unread > 0 && <span className="notif-bell-badge">{unread > 99 ? "99+" : unread}</span>}
    </button>
  );
}
