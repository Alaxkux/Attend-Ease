import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Sun, Moon, ChevronDown, User, LogOut } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "./ConfirmModal";
import api from "../../utils/api";
import toast from "react-hot-toast";
import "./DashNav.css";

export default function DashNav({ icon, brandTitle, brandSubtitle, notificationsPath = "/notifications" }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const fetchUnread = async () => {
    try {
      const { data } = await api.get("/notifications");
      setUnread(data.unreadCount || 0);
    } catch { /* silent — non-critical */ }
  };

  const initials = user?.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?";

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  return (
    <>
      <header className="dashnav">
        <div className="dashnav-brand">
          {/* <div className="dashnav-brand-icon">{icon}</div>
          <div>
            <h1 className="dashnav-brand-title">{brandTitle}</h1>
            {brandSubtitle && <span className="dashnav-brand-sub">{brandSubtitle}</span>}
          </div> */}
        </div>

        <div className="dashnav-actions">
          <button className="dashnav-icon-btn" title="Search (coming soon)" onClick={() => toast("Search is coming soon", { icon: "🔍" })}>
            <Search size={18} />
          </button>

          <button className="dashnav-icon-btn dashnav-bell" title="Notifications" onClick={() => navigate(notificationsPath)}>
            <Bell size={18} />
            {unread > 0 && <span className="dashnav-badge">{unread > 99 ? "99+" : unread}</span>}
          </button>

          <button className="dashnav-icon-btn" onClick={toggle} title="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="dashnav-profile" ref={menuRef}>
            <button className="dashnav-profile-btn" onClick={() => setMenuOpen(o => !o)}>
              {user?.avatarImage ? (
                <img src={user.avatarImage} alt="" className="dashnav-avatar-img" />
              ) : (
                <div className="dashnav-avatar-fallback">{initials}</div>
              )}
              <div className="dashnav-profile-text">
                <span className="dashnav-profile-name">{user?.name || "User"}</span>
                <span className="dashnav-profile-role">{user?.role}</span>
              </div>
              <ChevronDown size={15} className={`dashnav-chevron ${menuOpen ? "open" : ""}`} />
            </button>

            {menuOpen && (
              <div className="dashnav-menu animate-fadeIn">
                <button onClick={() => { setMenuOpen(false); navigate("/profile"); }}>
                  <User size={15} /> Profile
                </button>
                <button className="dashnav-menu-danger" onClick={() => setShowLogoutConfirm(true)}>
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ConfirmModal
        open={showLogoutConfirm}
        title="Log out?"
        body="You'll need to sign in again to access your dashboard."
        confirmLabel="Yes, Log Out"
        danger
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
