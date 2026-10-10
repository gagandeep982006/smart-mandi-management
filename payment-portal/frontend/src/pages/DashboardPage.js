import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight, History } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        async function fetchDashboardData() {
            setLoading(true);
            setError(null);
            try {
                const [statsRes, logsRes] = await Promise.all([
                    apiRequest("/dashboard/stats"),
                    apiRequest("/dashboard/recent-logs?limit=15")
                ]);

                if (isMounted) {
                    if (statsRes.success) setStats(statsRes.data);
                    if (logsRes.success) setRecentLogs(logsRes.data || []);
                }
            } catch (err) {
                if (isMounted) setError(err.message || "Failed to load dashboard data");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchDashboardData();
        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return <LoadingSpinner text="Loading state payment metrics..." size={32} />;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    const formatCurrency = (amt) => {
        return "₹" + Number(amt || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    };

    return (
        <div>
            {/* Page Header */}
            <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <h1 className="page-title">
                        {user?.state_name} Disbursal Overview
                    </h1>
                    <p className="page-subtitle">
                        Real-time procurement payment disbursements for {user?.state_name} State.
                    </p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="metrics-grid">
                {/* 1. Pending Payments */}
                <Link to="/payments/pending" style={{ textDecoration: "none" }}>
                    <div className="metric-card metric-pending">
                        <div className="metric-top">
                            <span className="metric-label">Pending Review</span>
                            <div className="metric-icon-box">
                                <Clock size={18} />
                            </div>
                        </div>
                        <div className="metric-value">{stats?.pending?.count || 0}</div>
                        <div className="metric-amount">{formatCurrency(stats?.pending?.amount)}</div>
                    </div>
                </Link>

                {/* 2. Processing Payments */}
                <Link to="/payments/processing" style={{ textDecoration: "none" }}>
                    <div className="metric-card metric-processing">
                        <div className="metric-top">
                            <span className="metric-label">In Processing</span>
                            <div className="metric-icon-box">
                                <RefreshCw size={18} />
                            </div>
                        </div>
                        <div className="metric-value">{stats?.processing?.count || 0}</div>
                        <div className="metric-amount">{formatCurrency(stats?.processing?.amount)}</div>
                    </div>
                </Link>

                {/* 3. Completed / Paid Payments */}
                <Link to="/payments/paid" style={{ textDecoration: "none" }}>
                    <div className="metric-card metric-paid">
                        <div className="metric-top">
                            <span className="metric-label">Completed / Paid</span>
                            <div className="metric-icon-box">
                                <CheckCircle2 size={18} />
                            </div>
                        </div>
                        <div className="metric-value">{stats?.paid?.count || 0}</div>
                        <div className="metric-amount">{formatCurrency(stats?.paid?.amount)}</div>
                    </div>
                </Link>

                {/* 4. Failed Payments */}
                <Link to="/payments/failed" style={{ textDecoration: "none" }}>
                    <div className="metric-card metric-failed">
                        <div className="metric-top">
                            <span className="metric-label">Failed Disbursals</span>
                            <div className="metric-icon-box">
                                <AlertTriangle size={18} />
                            </div>
                        </div>
                        <div className="metric-value">{stats?.failed?.count || 0}</div>
                        <div className="metric-amount">{formatCurrency(stats?.failed?.amount)}</div>
                    </div>
                </Link>

                {/* 5. Cancelled Payments */}
                <Link to="/payments/cancelled" style={{ textDecoration: "none" }}>
                    <div className="metric-card metric-cancelled">
                        <div className="metric-top">
                            <span className="metric-label">Cancelled</span>
                            <div className="metric-icon-box">
                                <XCircle size={18} />
                            </div>
                        </div>
                        <div className="metric-value">{stats?.cancelled?.count || 0}</div>
                        <div className="metric-amount">{formatCurrency(stats?.cancelled?.amount)}</div>
                    </div>
                </Link>
            </div>

            {/* Recent Audit Activity Section */}
            <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <History size={18} color="var(--primary-600)" />
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--gray-900)" }}>
                            Recent Activity & Audit Logs (MongoDB)
                        </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--gray-500)" }}>
                        Past 7 Days • State #{user?.state_id}
                    </span>
                </div>

                {recentLogs.length > 0 ? (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Operator</th>
                                    <th>Action</th>
                                    <th>Payment Ref</th>
                                    <th>Status Transition</th>
                                    <th>Outcome</th>
                                    <th>Details / Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogs.map((log, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontSize: "12px", color: "var(--gray-600)" }}>
                                            {new Date(log.timestamp).toLocaleString("en-IN")}
                                        </td>
                                        <td>
                                            <strong>{log.operator_username}</strong>
                                        </td>
                                        <td>
                                            <span style={{
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                padding: "2px 6px",
                                                borderRadius: "4px",
                                                backgroundColor: "var(--gray-100)",
                                                color: "var(--gray-700)"
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td>
                                            {log.payment_id ? (
                                                <Link
                                                    to={`/payments/pending?search=${log.payment_id}`}
                                                    style={{ color: "var(--primary-600)", fontWeight: 600 }}
                                                >
                                                    #{log.payment_id}
                                                </Link>
                                            ) : "—"}
                                        </td>
                                        <td>
                                            {log.previous_status && log.new_status ? (
                                                <span style={{ fontSize: "12px" }}>
                                                    {log.previous_status} → <strong>{log.new_status}</strong>
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td>
                                            <span style={{
                                                color: log.outcome === "SUCCESS" ? "#16a34a" : "#dc2626",
                                                fontWeight: 600,
                                                fontSize: "12px"
                                            }}>
                                                {log.outcome}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: "12px", color: "var(--gray-600)", maxWidth: "260px" }}>
                                            {log.reason || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state" style={{ padding: "32px 16px" }}>
                        <div className="empty-state-title">No Recent Audit Records</div>
                        <p>Actions performed on payments will appear here in real time.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
