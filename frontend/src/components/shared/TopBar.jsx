import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "./ConfirmModal";
import "./TopBar.css";

export default function TopBar({ title, back, actions, showLogout }) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/");
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          {back && (
            <button className="topbar-icon-btn" onClick={() => navigate(back)}>
              <ArrowLeft size={20} />
            </button>
          )}
          {title && <h2 className="topbar-title">{title}</h2>}
        </div>
        <div className="topbar-right">
          {actions}
          <button className="topbar-icon-btn" onClick={toggle} title="Toggle theme">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {showLogout && (
            <button className="topbar-icon-btn topbar-logout" onClick={() => setShowLogoutConfirm(true)} title="Logout">
              <LogOut size={18} />
            </button>
          )}
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