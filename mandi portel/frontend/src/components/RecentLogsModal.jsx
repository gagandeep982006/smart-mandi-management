import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import { 
    X, 
    Clock, 
    ChevronLeft, 
    ChevronRight, 
    Activity, 
    PhoneCall, 
    CheckCircle2, 
    Play, 
    CreditCard 
} from "lucide-react";

export default function RecentLogsModal({ isOpen, onClose }) {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    const fetchLogs = async (p = 1) => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/recent-logs?page=${p}&count=10`);
            if (res.success) {
                setLogs(res.data || []);
                setPage(res.page || 1);
                setTotalPages(res.totalPages || 1);
            }
        } catch (err) {
            console.error("Fetch logs error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchLogs(1);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: "640px" }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="card-title">
                        <Clock size={20} color="var(--primary)" />
                        Operational Activities Audit Log
                    </h3>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                            Loading activity logs...
                        </div>
                    ) : logs.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                            No recent activities recorded yet.
                        </div>
                    ) : (
                        <ul style={{ listStyle: "none" }}>
                            {logs.map((log, idx) => {
                                const text = log.recent_activity || "";
                                let Icon = Activity;
                                let iconColor = "var(--primary)";
                                if (text.includes("called") || text.includes("Called")) {
                                    Icon = PhoneCall;
                                    iconColor = "#d97706";
                                } else if (text.includes("completed") || text.includes("Completed")) {
                                    Icon = CheckCircle2;
                                    iconColor = "#16a34a";
                                } else if (text.includes("processing") || text.includes("Processing")) {
                                    Icon = Play;
                                    iconColor = "#0284c7";
                                } else if (text.includes("Payment") || text.includes("payment")) {
                                    Icon = CreditCard;
                                    iconColor = "#059669";
                                }

                                return (
                                    <li key={idx} style={{ 
                                        padding: "12px 0", 
                                        borderBottom: idx < logs.length - 1 ? "1px solid var(--border)" : "none",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: "12px"
                                    }}>
                                        <div style={{
                                            width: "28px",
                                            height: "28px",
                                            borderRadius: "6px",
                                            background: "var(--bg-main)",
                                            border: "1px solid var(--border)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            marginTop: "2px"
                                        }}>
                                            <Icon size={14} color={iconColor} />
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 550, color: "var(--text-main)", fontSize: "0.9rem" }}>
                                                {log.recent_activity}
                                            </div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                                Operator: <strong>{log.username}</strong>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-light)", whiteSpace: "nowrap" }}>
                                            {new Date(log.navigate_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="modal-footer" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Page {page} of {totalPages}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                            type="button"
                            className="btn btn-outline btn-sm" 
                            disabled={page <= 1 || loading}
                            onClick={() => fetchLogs(page - 1)}
                        >
                            <ChevronLeft size={15} /> Prev
                        </button>
                        <button 
                            type="button"
                            className="btn btn-outline btn-sm" 
                            disabled={page >= totalPages || loading}
                            onClick={() => fetchLogs(page + 1)}
                        >
                            Next <ChevronRight size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
