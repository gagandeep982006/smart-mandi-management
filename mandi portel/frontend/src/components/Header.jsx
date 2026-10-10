import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { LogOut, Store, Shield } from "lucide-react";
import "./Header.css";

export default function Header({ onToggleSidebar }) {
    const { user, mandi, logout } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const handleLogout = async () => {
        try {
            await logout();
            toast.info("Logged out successfully");
            navigate("/login");
        } catch (err) {
            console.error("Logout error:", err);
            navigate("/login");
        }
    };

    const initial = user?.username ? user.username.charAt(0).toUpperCase() : "O";

    return (
        <header className="app-topbar">
            <div className="topbar-left">
                {/* Mobile Hamburger Button */}
                <button 
                    className="hamburger-btn" 
                    onClick={onToggleSidebar}
                    aria-label="Toggle Navigation Drawer"
                >
                    <span className="hamburger-line"></span>
                    <span className="hamburger-line"></span>
                    <span className="hamburger-line"></span>
                </button>

                <div className="topbar-brand">
                    <span className="topbar-title">Mandi Portal</span>
                    {mandi?.mandi_name && (
                        <span className="topbar-mandi-tag">
                            <Store size={12} />
                            {mandi.mandi_name}
                        </span>
                    )}
                </div>
            </div>

            {/* Profile & Logout */}
            <div className="topbar-right">
                <div 
                    className="topbar-profile" 
                    onClick={() => navigate("/profile")}
                    style={{ cursor: "pointer" }}
                    title={`View Profile for ${user?.username} (${user?.role})`}
                >
                    <div className="topbar-avatar">{initial}</div>
                    <div className="topbar-details">
                        <span className="topbar-name">{user?.username || "Operator"}</span>
                        <div className="topbar-sub">
                            <span className="topbar-badge-role">
                                {user?.role ? user.role.replace(/_/g, " ") : "Operator"}
                            </span>
                            <span>•</span>
                            <span>Mandi #{user?.mandi_id || "N/A"}</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleLogout} 
                    className="topbar-logout-btn"
                    title="Log out of Mandi Portal"
                >
                    <LogOut size={15} />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    );
}
