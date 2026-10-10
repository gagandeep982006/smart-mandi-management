import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { apiFetch } from "../api/client";
import RecentLogsModal from "../components/RecentLogsModal";
import { formatIndianTime } from "../utils/dateUtils";
import { 
    Store, 
    Layers, 
    Clock, 
    Calendar,
    ChevronRight, 
    CheckCircle2, 
    AlertTriangle,
    Users,
    Hourglass,
    PhoneCall,
    Play,
    UserCheck,
    UserX,
    RefreshCw,
    Activity,
    MapPin,
    ArrowUpRight
} from "lucide-react";

export default function Dashboard() {
    const { user, mandi } = useAuth();
    const toast = useToast();

    const [counters, setCounters] = useState([]);
    const [counterSummaries, setCounterSummaries] = useState({});
    const [timing, setTiming] = useState(null);
    const [workingDays, setWorkingDays] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

    const loadDashboardData = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            // 1. Fetch assigned counters
            const countersRes = await apiFetch("/api/counters/my");
            const countersData = countersRes.success ? (countersRes.data || []) : [];
            setCounters(countersData);

            // 2. Fetch timing & working days for Mandi Overview
            const [timingRes, daysRes] = await Promise.all([
                apiFetch("/api/mandi/timing").catch(() => ({ success: false })),
                apiFetch("/api/mandi/working-days").catch(() => ({ success: false }))
            ]);

            if (timingRes.success && timingRes.data) {
                setTiming(timingRes.data);
            }
            if (daysRes.success && Array.isArray(daysRes.data)) {
                setWorkingDays(daysRes.data);
            }

            // 3. Fetch summaries for each assigned counter in parallel
            const summariesMap = {};
            if (countersData.length > 0) {
                const summaryPromises = countersData.map(c => 
                    apiFetch(`/api/counters/${c.counter_id}/summary`)
                        .then(res => ({ id: c.counter_id, data: res.success ? res.data : null }))
                        .catch(() => ({ id: c.counter_id, data: null }))
                );
                const summaries = await Promise.all(summaryPromises);
                summaries.forEach(s => {
                    if (s.data) summariesMap[s.id] = s.data;
                });
            }
            setCounterSummaries(summariesMap);

            // 4. Fetch recent logs
            const logsRes = await apiFetch("/api/recent-logs?page=1&count=8");
            if (logsRes.success) {
                setRecentLogs(logsRes.data || []);
            }

            if (isManualRefresh) {
                toast.success("Dashboard metrics refreshed");
            }
        } catch (err) {
            console.error("Dashboard data load error:", err);
            toast.error("Failed to load some dashboard metrics");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    // Summary calculations: based on total farmers coming today (in Qtl) and updated as farmers are completed
    const totalScheduledToday = counters.reduce((acc, c) => {
        const sum = counterSummaries[c.counter_id];
        return acc + (parseFloat(sum?.total_day_quantity ?? c.used_capacity_qtl ?? c.used_capacity ?? (parseFloat(c.capacity_per_day || 0) * 10)) || 0);
    }, 0);
    const totalProcuredToday = counters.reduce((acc, c) => {
        const sum = counterSummaries[c.counter_id];
        return acc + (parseFloat(sum?.completed_quantity ?? 0) || 0);
    }, 0);
    const totalRemainingToday = counters.reduce((acc, c) => {
        const sum = counterSummaries[c.counter_id];
        const dayQty = parseFloat(sum?.total_day_quantity ?? c.used_capacity_qtl ?? c.used_capacity ?? (parseFloat(c.capacity_per_day || 0) * 10)) || 0;
        const compQty = parseFloat(sum?.completed_quantity ?? 0) || 0;
        return acc + (parseFloat(sum?.remaining_quantity ?? Math.max(0, dayQty - compQty)) || 0);
    }, 0);

    // Aggregated operations counts
    const aggregatedOps = counters.reduce((acc, c) => {
        const sum = counterSummaries[c.counter_id];
        const counts = sum?.counts || {};
        acc.waiting += Number(counts.waiting || 0);
        acc.called += Number(counts.called || 0);
        acc.arrived += Number(counts.arrived || 0);
        acc.processing += Number(counts.processing || 0);
        acc.completed += Number(counts.completed || c.completed_count || 0);
        acc.notArrived += Number(counts.not_arrived || 0);
        acc.total += Number(counts.total_today || (acc.waiting + acc.called + acc.arrived + acc.processing + acc.completed + acc.notArrived));
        return acc;
    }, { total: 0, waiting: 0, called: 0, arrived: 0, processing: 0, completed: 0, notArrived: 0 });

    const activeWorkingDaysSummary = workingDays
        .filter(d => d.is_working)
        .map(d => d.day_of_week.slice(0, 3))
        .join(", ") || "Mon - Sat";

    return (
        <div className="main-content">
            {/* Top Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                    <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-main)" }}>
                        Operations Dashboard
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2px" }}>
                        Real-time procurement queue management, counter capacity tracking, and farmer processing.
                    </p>
                </div>

                <button 
                    type="button" 
                    className="btn btn-outline btn-sm"
                    onClick={() => loadDashboardData(true)}
                    disabled={loading || refreshing}
                >
                    <RefreshCw size={14} className={refreshing ? "spin" : ""} />
                    <span>Refresh Data</span>
                </button>
            </div>

            {/* ========================================================
                SECTION 1 — MANDI OVERVIEW
               ======================================================== */}
            <section style={{ marginBottom: "28px" }}>
                <div className="card" style={{ borderLeft: "4px solid var(--primary)" }}>
                    <div className="card-header" style={{ paddingBottom: "12px" }}>
                        <span className="card-title">
                            <Store size={18} color="var(--primary)" />
                            Mandi Overview
                        </span>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span className="badge badge-active">Active</span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                Mandi #{user?.mandi_id || mandi?.mandi_id}
                            </span>
                        </div>
                    </div>

                    <div style={{ 
                        display: "grid", 
                        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
                        gap: "18px", 
                        marginTop: "8px" 
                    }}>
                        {/* Mandi Name */}
                        <div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Mandi Facility
                            </span>
                            <strong style={{ fontSize: "1.1rem", color: "var(--text-main)", display: "block", marginTop: "2px" }}>
                                {mandi?.mandi_name || "Mandi Station"}
                            </strong>
                        </div>

                        {/* Location */}
                        <div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Location
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                                <MapPin size={14} color="var(--text-muted)" />
                                <strong style={{ fontSize: "0.95rem", color: "var(--text-main)" }}>
                                    {mandi?.tehsil_id ? `Tehsil #${mandi.tehsil_id}` : "Regional Hub"}
                                </strong>
                            </div>
                        </div>

                        {/* Current Status */}
                        <div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Current Status
                            </span>
                            <span className="badge badge-active" style={{ marginTop: "4px" }}>
                                Operational
                            </span>
                        </div>

                        {/* Operating Hours */}
                        <div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Opening / Closing Time
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                <Clock size={14} color="var(--primary)" />
                                <strong style={{ fontSize: "0.95rem" }}>
                                    {timing?.opening_time ? timing.opening_time.slice(0, 5) : "09:00"} - {timing?.closing_time ? timing.closing_time.slice(0, 5) : "17:00"}
                                </strong>
                            </div>
                        </div>

                        {/* Working Days */}
                        <div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Working Days
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                <Calendar size={14} color="var(--secondary)" />
                                <strong style={{ fontSize: "0.9rem" }}>
                                    {activeWorkingDaysSummary}
                                </strong>
                            </div>
                        </div>

                        {/* Total Mandi Capacity Per Day */}
                        <div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Mandi Daily Capacity
                            </span>
                            <strong style={{ fontSize: "1.1rem", color: "var(--primary)", display: "block", marginTop: "2px" }}>
                                {parseFloat(mandi?.capacity || (counters[0]?.mandi_capacity ?? 0)).toFixed(2)} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>MT/day</span>
                            </strong>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                                ({(parseFloat(mandi?.capacity || (counters[0]?.mandi_capacity ?? 0)) * 10).toFixed(1)} Qtl/day)
                            </span>
                        </div>

                        {/* Today's Scheduled Quantity */}
                        <div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Scheduled Today
                            </span>
                            <strong style={{ fontSize: "1.1rem", color: "var(--text-main)", display: "block", marginTop: "2px" }}>
                                {totalScheduledToday.toFixed(2)} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>Qtl</span>
                            </strong>
                        </div>

                        {/* Completed Procured */}
                        <div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Procured Today
                            </span>
                            <strong style={{ fontSize: "1.1rem", color: "var(--success)", display: "block", marginTop: "2px" }}>
                                {totalProcuredToday.toFixed(2)} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--success)" }}>Qtl</span>
                            </strong>
                        </div>

                        {/* Remaining to Procure */}
                        <div>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Remaining Today
                            </span>
                            <strong style={{ fontSize: "1.1rem", color: totalRemainingToday > 0 ? "var(--warning)" : "var(--success)", display: "block", marginTop: "2px" }}>
                                {totalRemainingToday.toFixed(2)} <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)" }}>Qtl</span>
                            </strong>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================
                SECTION 2 — COUNTERS (Max 3 cards/row desktop, 2 tablet, 1 phone)
               ======================================================== */}
            <section id="counters-section" style={{ marginBottom: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Layers size={18} color="var(--primary)" />
                        Assigned Counters ({counters.length})
                    </h2>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Select a counter to manage active live queues
                    </span>
                </div>

                {counters.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
                        <AlertTriangle size={32} color="var(--warning)" style={{ margin: "0 auto 10px auto" }} />
                        <h3 style={{ fontSize: "1.05rem" }}>No Counters Assigned</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                            Your user account is not currently assigned to any Mandi counter. Please contact your Mandi Administrator.
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: "18px"
                    }}>
                        {counters.map(c => {
                            const sum = counterSummaries[c.counter_id];
                            const totalDay = parseFloat(sum?.total_day_quantity ?? c.used_capacity_qtl ?? c.used_capacity ?? (parseFloat(c.capacity_per_day || 0) * 10)) || 0;
                            const completed = parseFloat(sum?.completed_quantity ?? 0) || 0;
                            const remaining = parseFloat(sum?.remaining_quantity ?? Math.max(0, totalDay - completed)) || 0;
                            const percent = totalDay > 0 ? Math.min(100, Math.round((completed / totalDay) * 100)) : 0;
                            const waitingCount = sum?.counts?.waiting ?? c.current_queue_count ?? 0;
                            const activeToken = sum?.current_active_token || c.current_token;
                            const isActive = c.status === "active";

                            return (
                                <div key={c.counter_id} className="card counter-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                    <div>
                                        {/* Card Top */}
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                            <div>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase" }}>
                                                    Counter {c.counter_number}
                                                </span>
                                                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)", marginTop: "1px" }}>
                                                    {c.counter_name}
                                                </h3>
                                            </div>
                                            <span className={isActive ? "badge badge-active" : "badge badge-inactive"}>
                                                {isActive ? "Active" : "Inactive"}
                                            </span>
                                        </div>

                                        {/* Crop & Counter Daily Capacity Info */}
                                        <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", marginBottom: "14px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Assigned Crop:</span>
                                                <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                                                    🌾 {c.crop_name || `Crop #${c.crop_id}`}
                                                </strong>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border)", paddingTop: "6px" }}>
                                                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Counter Daily Capacity:</span>
                                                <strong style={{ fontSize: "0.85rem", color: "var(--primary)" }}>
                                                    ⚖️ {parseFloat(c.capacity_per_day || 0).toFixed(2)} MT/day <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>({(parseFloat(c.capacity_per_day || 0) * 10).toFixed(1)} Qtl)</span>
                                                </strong>
                                            </div>
                                            {c.crop_quota && (
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border)", paddingTop: "6px", marginTop: "6px", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                                    <span>{c.crop_quota.state_name} Quota:</span>
                                                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                                                        MSP ₹{c.crop_quota.msp}/q • LSP ₹{c.crop_quota.lsp}/q
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Procurement Progress */}
                                        <div style={{ marginBottom: "14px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                                                <span style={{ color: "var(--text-muted)" }}>Procured (Today):</span>
                                                <strong>{completed.toFixed(2)} / {totalDay.toFixed(2)} Qtl ({percent}%)</strong>
                                            </div>
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill" 
                                                    style={{ 
                                                        width: `${percent}%`,
                                                        backgroundColor: "var(--primary)"
                                                    }} 
                                                />
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                                                <span>Remaining: <strong style={{ color: remaining > 0 ? "var(--warning)" : "var(--success)" }}>{remaining.toFixed(2)} Qtl</strong></span>
                                                <span>Avg: {c.average_time_minutes || 15} mins</span>
                                            </div>
                                        </div>

                                        {/* Status metrics */}
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                                            <div style={{ background: "#f1f5f9", padding: "8px", borderRadius: "6px" }}>
                                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Waiting in Queue</span>
                                                <strong style={{ fontSize: "1.1rem", color: "var(--text-main)" }}>{waitingCount}</strong>
                                            </div>
                                            <div style={{ background: activeToken ? "var(--primary-light)" : "#f8fafc", padding: "8px", borderRadius: "6px" }}>
                                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Active Farmer</span>
                                                <strong style={{ fontSize: "0.85rem", color: activeToken ? "var(--primary)" : "var(--text-muted)" }}>
                                                    {activeToken ? activeToken.token_number : "None active"}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <Link 
                                        to={`/counter/${c.counter_id}`} 
                                        className="btn btn-primary"
                                        style={{ width: "100%", justifyContent: "center" }}
                                    >
                                        <span>Open Counter Desk</span>
                                        <ChevronRight size={15} />
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ========================================================
                SECTION 3 — OPERATION SUMMARY
               ======================================================== */}
            <section style={{ marginBottom: "28px" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Activity size={18} color="var(--primary)" />
                    Operation Summary (Today)
                </h2>

                <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", 
                    gap: "12px" 
                }}>
                    {/* Total Farmers Today */}
                    <div className="card" style={{ padding: "14px", borderTop: "3px solid #64748b" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Total Farmers</span>
                            <Users size={16} color="#64748b" />
                        </div>
                        <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--text-main)", marginTop: "6px" }}>
                            {aggregatedOps.total}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Booked today</span>
                    </div>

                    {/* Waiting */}
                    <div className="card" style={{ padding: "14px", borderTop: "3px solid #f59e0b" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Waiting</span>
                            <Hourglass size={16} color="#f59e0b" />
                        </div>
                        <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#d97706", marginTop: "6px" }}>
                            {aggregatedOps.waiting}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>In counter queues</span>
                    </div>

                    {/* Called */}
                    <div className="card" style={{ padding: "14px", borderTop: "3px solid #0284c7" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Called</span>
                            <PhoneCall size={16} color="#0284c7" />
                        </div>
                        <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#0284c7", marginTop: "6px" }}>
                            {aggregatedOps.called}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Awaiting arrival</span>
                    </div>

                    {/* Arrived */}
                    <div className="card" style={{ padding: "14px", borderTop: "3px solid #8b5cf6" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Arrived</span>
                            <UserCheck size={16} color="#8b5cf6" />
                        </div>
                        <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#7c3aed", marginTop: "6px" }}>
                            {aggregatedOps.arrived}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>At the counter</span>
                    </div>

                    {/* Processing */}
                    <div className="card" style={{ padding: "14px", borderTop: "3px solid #06b6d4" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Processing</span>
                            <Play size={16} color="#06b6d4" />
                        </div>
                        <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#0891b2", marginTop: "6px" }}>
                            {aggregatedOps.processing}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Weighing & grading</span>
                    </div>

                    {/* Completed */}
                    <div className="card" style={{ padding: "14px", borderTop: "3px solid #10b981" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Completed</span>
                            <CheckCircle2 size={16} color="#10b981" />
                        </div>
                        <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#059669", marginTop: "6px" }}>
                            {aggregatedOps.completed}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Sales finalized</span>
                    </div>

                    {/* Not Arrived */}
                    <div className="card" style={{ padding: "14px", borderTop: "3px solid #ef4444" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Not Arrived</span>
                            <UserX size={16} color="#ef4444" />
                        </div>
                        <div style={{ fontSize: "1.45rem", fontWeight: 700, color: "#dc2626", marginTop: "6px" }}>
                            {aggregatedOps.notArrived}
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>No-show recorded</span>
                    </div>
                </div>
            </section>

            {/* ========================================================
                SECTION 4 — RECENT ACTIVITY (from MandiRecentLogs)
               ======================================================== */}
            <section style={{ marginBottom: "28px" }}>
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">
                            <Clock size={18} color="var(--primary)" />
                            Recent Activity Log
                        </span>
                        <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => setIsLogsModalOpen(true)}
                        >
                            <span>View All Logs</span>
                            <ArrowUpRight size={14} />
                        </button>
                    </div>

                    {recentLogs.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "12px 0" }}>
                            No recent operational logs found.
                        </p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                            {recentLogs.map((log, idx) => (
                                <div 
                                    key={idx} 
                                    style={{ 
                                        display: "flex", 
                                        justifyContent: "space-between", 
                                        alignItems: "center",
                                        padding: "10px 12px",
                                        backgroundColor: idx % 2 === 0 ? "#f8fafc" : "#ffffff",
                                        borderRadius: "6px",
                                        fontSize: "0.85rem"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--primary)" }} />
                                        <span style={{ color: "var(--text-main)", fontWeight: 500 }}>
                                            {log.recent_activity}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                        <span>Operator: <strong>{log.username}</strong></span>
                                        <span>{formatIndianTime(log.navigate_at)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Full Logs Modal */}
            <RecentLogsModal 
                isOpen={isLogsModalOpen} 
                onClose={() => setIsLogsModalOpen(false)} 
            />
        </div>
    );
}
