import React from "react";
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Clock,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    IndianRupee,
    User,
    X
} from "lucide-react";

const NAV_ITEMS = [
    {
        name: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard
    },
    {
        name: "Pending Payments",
        path: "/payments/pending",
        icon: Clock,
        statusKey: "PENDING"
    },
    {
        name: "Processing Payments",
        path: "/payments/processing",
        icon: RefreshCw,
        statusKey: "PROCESSING"
    },
    {
        name: "Completed / Paid",
        path: "/payments/paid",
        icon: CheckCircle2,
        statusKey: "PAID"
    },
    {
        name: "Cancelled Payments",
        path: "/payments/cancelled",
        icon: XCircle,
        statusKey: "CANCELLED"
    },
    {
        name: "Failed Payments",
        path: "/payments/failed",
        icon: AlertTriangle,
        statusKey: "FAILED"
    },
    {
        name: "My Profile",
        path: "/profile",
        icon: User
    }
];

export default function Sidebar({ isOpen, onCloseMobile }) {
    return (
        <aside className={`dashboard-sidebar ${isOpen ? "open" : ""}`}>
            <div className="sidebar-brand">
                <div className="sidebar-logo-icon">
                    <IndianRupee size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sidebar-title">Payment Portal</div>
                    <div className="sidebar-subtitle">MSP Procurement Disbursals</div>
                </div>
                <button
                    className="sidebar-close-btn"
                    onClick={onCloseMobile}
                    title="Close menu"
                    aria-label="Close menu"
                >
                    <X size={18} />
                </button>
            </div>

            <nav className="sidebar-nav">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}
                            onClick={onCloseMobile}
                        >
                            <Icon size={18} />
                            <span>{item.name}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div>Govt. of India • State Portal</div>
                <div style={{ marginTop: "4px", fontSize: "10px" }}>v1.0.0 (Production)</div>
            </div>
        </aside>
    );
}
