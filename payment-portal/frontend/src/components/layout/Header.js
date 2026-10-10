import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Menu, LogOut, MapPin, Shield } from "lucide-react";

export default function Header({ onToggleSidebar }) {
    const { user, logout } = useAuth();

    return (
        <header className="dashboard-header">
            <div className="header-left">
                <button
                    onClick={onToggleSidebar}
                    className="btn btn-secondary btn-sm sidebar-toggle-btn"
                    style={{ padding: "6px 8px" }}
                    title="Toggle navigation"
                    aria-label="Toggle navigation menu"
                >
                    <Menu size={18} />
                </button>

                {user?.state_name && (
                    <div className="header-state-badge">
                        <MapPin size={13} />
                        <span>{user.state_name} ({user.state_code || "IN"})</span>
                    </div>
                )}
            </div>

            <div className="header-right">
                <div className="header-user-info">
                    <div className="user-avatar" title={`User ID: #${user?.payment_user_id}`}>
                        {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                        <div className="user-name">{user?.username}</div>
                        <div className="user-role" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <Shield size={10} />
                            <span>{user?.role?.replace("_", " ")}</span>
                        </div>
                    </div>
                </div>

                <button
                    className="btn btn-secondary btn-sm"
                    onClick={logout}
                    title="Sign Out"
                    style={{ gap: "6px", color: "var(--danger-600)" }}
                >
                    <LogOut size={15} />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    );
}
