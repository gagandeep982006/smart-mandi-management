import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { 
    LayoutDashboard, 
    Layers, 
    CheckCircle2, 
    Settings, 
    LogOut, 
    Store, 
    User,
    Bot,
    Clock,
    X
} from "lucide-react";
import "./Sidebar.css";

export default function Sidebar({ isOpen, onClose }) {
    const { user, mandi, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useToast();

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await logout();
            toast.info("Logged out successfully");
            navigate("/login");
        } catch (err) {
            console.error("Logout error:", err);
            navigate("/login");
        }
    };

    const scrollToCounters = (e) => {
        if (location.pathname === "/") {
            e.preventDefault();
            const el = document.getElementById("counters-section");
            if (el) {
                el.scrollIntoView({ behavior: "smooth" });
            }
        }
        if (onClose) onClose();
    };

    return (
        <aside className={`app-sidebar ${isOpen ? "sidebar-open" : ""}`}>
            {/* Header / Brand */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <span className="leaf-icon">🌾</span>
                    <div className="brand-texts">
                        <h2 className="brand-title">Mandi Portal</h2>
                        <p className="brand-subtitle">Operational Desk</p>
                    </div>
                </div>
                <button 
                    className="sidebar-close-btn" 
                    onClick={onClose} 
                    aria-label="Close navigation menu"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-nav">
                <NavLink 
                    to="/" 
                    end 
                    className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                    onClick={onClose}
                >
                    <span className="link-icon"><LayoutDashboard size={18} /></span>
                    <span>Dashboard</span>
                </NavLink>

                <NavLink 
                    to="/#counters" 
                    className={({ isActive }) => `sidebar-link ${location.hash === "#counters" ? "active" : ""}`}
                    onClick={scrollToCounters}
                >
                    <span className="link-icon"><Layers size={18} /></span>
                    <span>Counters</span>
                </NavLink>

                <NavLink 
                    to="/completed" 
                    className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                    onClick={onClose}
                >
                    <span className="link-icon"><CheckCircle2 size={18} /></span>
                    <span>Completed Farmers</span>
                </NavLink>

                <NavLink 
                    to="/settings" 
                    className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                    onClick={onClose}
                >
                    <span className="link-icon"><Settings size={18} /></span>
                    <span>Mandi Settings</span>
                </NavLink>

                <NavLink 
                    to="/counter-timings" 
                    className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                    onClick={onClose}
                >
                    <span className="link-icon"><Clock size={18} /></span>
                    <span>Counter Timings</span>
                </NavLink>

                <NavLink 
                    to="/profile" 
                    className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                    onClick={onClose}
                >
                    <span className="link-icon"><User size={18} /></span>
                    <span>My Profile</span>
                </NavLink>

                <NavLink 
                    to="/chatbot" 
                    className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
                    onClick={onClose}
                >
                    <span className="link-icon"><Bot size={18} /></span>
                    <span>Chatbot</span>
                </NavLink>
            </nav>

            {/* Bottom Section */}
            <div className="sidebar-bottom">
                <div className="sidebar-user-pill">
                    <div className="sidebar-user-avatar">
                        {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name">{user?.username || "Operator"}</span>
                        <span className="sidebar-user-mandi">{mandi?.mandi_name || `Mandi #${user?.mandi_id || ""}`}</span>
                    </div>
                </div>

                <button 
                    onClick={handleLogout} 
                    className="sidebar-link"
                    style={{ 
                        background: "none", 
                        border: "none", 
                        width: "100%", 
                        textAlign: "left", 
                        cursor: "pointer", 
                        font: "inherit",
                        color: "#fca5a5"
                    }}
                >
                    <span className="link-icon"><LogOut size={18} /></span>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
