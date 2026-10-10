import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { formatIndianDate } from "../utils/dateUtils";
import { 
    Settings, 
    Clock, 
    Calendar, 
    CheckCircle, 
    AlertTriangle, 
    ShieldCheck, 
    Lock,
    Store,
    Info,
    RefreshCw,
    KeyRound
} from "lucide-react";

export default function MandiSettings() {
    const { user, mandi } = useAuth();
    const toast = useToast();

    const [timingData, setTimingData] = useState(null);
    const [openingTime, setOpeningTime] = useState("08:30");
    const [closingTime, setClosingTime] = useState("17:30");
    const [workingDays, setWorkingDays] = useState([
        { day_of_week: "Monday", is_working: true },
        { day_of_week: "Tuesday", is_working: true },
        { day_of_week: "Wednesday", is_working: true },
        { day_of_week: "Thursday", is_working: true },
        { day_of_week: "Friday", is_working: true },
        { day_of_week: "Saturday", is_working: true },
        { day_of_week: "Sunday", is_working: false }
    ]);
    const [loading, setLoading] = useState(true);
    const [savingTiming, setSavingTiming] = useState(false);
    const [savingDays, setSavingDays] = useState(false);

    // Two-factor password modal state
    const [verifyModal, setVerifyModal] = useState({
        isOpen: false,
        target: "", // "timing" | "working_days"
        title: "",
        message: ""
    });
    const [verificationPassword, setVerificationPassword] = useState("");
    const [submittingPassword, setSubmittingPassword] = useState(false);

    // Permission checks: must be mandi_operator with update permission
    const isMandiOperator = user?.role === "mandi_operator";
    const hasUpdatePermission = Array.isArray(user?.permissions) && user.permissions.includes("update");
    const canEditSettings = isMandiOperator && hasUpdatePermission;

    const fetchSettings = async () => {
        setLoading(true);
        try {
            // 1. Fetch timing
            const timingRes = await apiFetch("/api/mandi/timing");
            if (timingRes.success && timingRes.data) {
                setTimingData(timingRes.data);
                const initOpen = (timingRes.data.has_pending_change && timingRes.data.pending_opening_time)
                    ? timingRes.data.pending_opening_time.slice(0, 5)
                    : (timingRes.data.opening_time?.slice(0, 5) || "08:30");
                const initClose = (timingRes.data.has_pending_change && timingRes.data.pending_closing_time)
                    ? timingRes.data.pending_closing_time.slice(0, 5)
                    : (timingRes.data.closing_time?.slice(0, 5) || "17:30");
                setOpeningTime(initOpen);
                setClosingTime(initClose);
            }

            // 2. Fetch working days
            const daysRes = await apiFetch("/api/mandi/working-days");
            if (daysRes.success && daysRes.data?.length > 0) {
                setWorkingDays(daysRes.data.map(d => ({
                    day_of_week: d.day_of_week,
                    is_working: Boolean(d.is_working),
                    pending_is_working: d.has_pending_change ? Boolean(d.pending_is_working) : null,
                    effective_date: d.effective_date,
                    has_pending_change: Boolean(d.has_pending_change)
                })));
            }
        } catch (err) {
            console.error("Fetch settings error:", err);
            toast.error("Failed to load current Mandi settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    // Initiates Two-Factor Verification prompt for Timing
    const promptSaveTiming = (e) => {
        e.preventDefault();
        if (!canEditSettings) return;
        setVerificationPassword("");
        setVerifyModal({
            isOpen: true,
            target: "timing",
            title: "Confirm Operating Hours Update",
            message: `You are configuring Mandi operating hours to ${openingTime} - ${closingTime}. Note: Changes will become effective exactly 7 days after authorization. Enter your administrative password to proceed.`
        });
    };

    // Initiates Two-Factor Verification prompt for Working Days
    const promptSaveDays = (e) => {
        e.preventDefault();
        if (!canEditSettings) return;
        setVerificationPassword("");
        setVerifyModal({
            isOpen: true,
            target: "working_days",
            title: "Confirm Working Days Schedule",
            message: "You are modifying the Mandi weekly operating calendar. Note: Changes will become effective exactly 7 days after authorization. Enter your administrative password to proceed."
        });
    };

    const handleExecuteVerifiedAction = async () => {
        if (!verificationPassword) {
            toast.error("Verification password is required");
            return;
        }

        setSubmittingPassword(true);
        try {
            if (verifyModal.target === "timing") {
                const res = await apiFetch("/api/mandi/timing", {
                    method: "PATCH",
                    body: {
                        opening_time: `${openingTime}:00`,
                        closing_time: `${closingTime}:00`,
                        password: verificationPassword
                    }
                });
                toast.success(res.message || "Mandi operating hours updated successfully (effective in 7 days)");
                setVerifyModal(prev => ({ ...prev, isOpen: false }));
                await fetchSettings();
            } else if (verifyModal.target === "working_days") {
                const res = await apiFetch("/api/mandi/working-days", {
                    method: "PATCH",
                    body: {
                        working_days: workingDays,
                        password: verificationPassword
                    }
                });
                toast.success(res.message || "Weekly working days schedule updated successfully (effective in 7 days)");
                setVerifyModal(prev => ({ ...prev, isOpen: false }));
                await fetchSettings();
            }
        } catch (err) {
            toast.error(err.message || "Additional verification failed.");
        } finally {
            setSubmittingPassword(false);
        }
    };

    const handleToggleDay = (dayName) => {
        if (!canEditSettings) return;
        setWorkingDays(days => days.map(d => 
            d.day_of_week === dayName ? { ...d, is_working: !d.is_working } : d
        ));
    };

    return (
        <div className="main-content">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1.35rem", fontWeight: 700, color: "var(--text-main)" }}>
                        <Settings size={22} color="var(--primary)" />
                        Mandi Facility Settings
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "2px" }}>
                        Configure facility operating hours and working day schedules. Changes require two-factor verification.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <Link 
                        to="/counter-timings" 
                        className="btn btn-outline btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                        <Clock size={14} color="var(--primary)" />
                        <span>Counter Timings</span>
                    </Link>

                    <button 
                        type="button" 
                        className="btn btn-outline btn-sm"
                        onClick={fetchSettings}
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? "spin" : ""} />
                        <span>Reload Settings</span>
                    </button>
                </div>
            </div>

            {/* Operator Authorization Notice */}
            {!canEditSettings && (
                <div className="alert alert-warning" style={{ marginBottom: "24px" }}>
                    <Lock size={18} style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: "0.85rem" }}>
                        <strong>View-Only Mode:</strong> Your role ({user?.role || "mandi_user"}) has read-only access. Only users with the <code>mandi_operator</code> role and <code>update</code> permissions may modify operating schedules.
                    </div>
                </div>
            )}

            <div className="grid-2">
                {/* 1. Operating Hours Card */}
                <div 
                    className="card"
                    style={{
                        border: timingData?.has_pending_change ? "1.5px solid #3b82f6" : "1px solid var(--border)",
                        boxShadow: timingData?.has_pending_change ? "0 4px 16px rgba(59, 130, 246, 0.12)" : "none"
                    }}
                >
                    <div className="card-header">
                        <span className="card-title">
                            <Clock size={18} color="var(--primary)" />
                            Mandi Operating Hours
                        </span>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span className="badge badge-primary">Daily Window</span>
                            {timingData?.has_pending_change && (
                                <span style={{
                                    fontSize: "0.7rem",
                                    backgroundColor: "#dbeafe",
                                    color: "#1e40af",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontWeight: 700
                                }}>
                                    Pending Update
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Pending Operating Hours Alert Banner */}
                    {timingData?.has_pending_change && (
                        <div style={{
                            backgroundColor: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            marginBottom: "16px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px"
                        }}>
                            <Calendar size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                                    <strong style={{ fontSize: "0.82rem", color: "#1d4ed8" }}>
                                        ⏳ Pending Operating Hours Updates
                                    </strong>
                                    <span style={{
                                        fontSize: "0.7rem",
                                        backgroundColor: "#dbeafe",
                                        color: "#1e40af",
                                        padding: "2px 7px",
                                        borderRadius: "12px",
                                        fontWeight: 600
                                    }}>
                                        Effective: {formatIndianDate(timingData.effective_date)}
                                    </span>
                                </div>
                                <span style={{ fontSize: "0.74rem", color: "#3b82f6", display: "block", marginTop: "3px" }}>
                                    Bookings and slot generation prior to effective date follow currently active hours.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Operating Window Row Block */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        backgroundColor: "var(--primary-light)",
                        border: `1px solid ${timingData?.has_pending_change ? "#3b82f6" : "var(--primary-border)"}`,
                        marginBottom: "16px"
                    }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Clock size={16} color="var(--primary-dark)" />
                                <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--primary-dark)" }}>
                                    Intake Operating Hours
                                </span>
                            </div>
                            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginTop: "2px", paddingLeft: "24px" }}>
                                Current: <strong>{timingData?.opening_time?.slice(0, 5) || "09:00"} — {timingData?.closing_time?.slice(0, 5) || "17:00"}</strong>
                            </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)" }}>
                                ACTIVE WINDOW
                            </span>
                            {timingData?.has_pending_change && (
                                <span style={{
                                    fontSize: "0.7rem",
                                    backgroundColor: "#dbeafe",
                                    color: "#1e40af",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontWeight: 600
                                }}>
                                    Pending: {timingData.pending_opening_time?.slice(0, 5)} — {timingData.pending_closing_time?.slice(0, 5)}
                                </span>
                            )}
                        </div>
                    </div>

                    <form onSubmit={promptSaveTiming}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                            <div className="form-group">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                    <label className="form-label" style={{ margin: 0 }}>
                                        Opening Time (Daily)
                                    </label>
                                    {timingData?.has_pending_change && (
                                        <span style={{
                                            fontSize: "0.7rem",
                                            backgroundColor: "#dbeafe",
                                            color: "#1e40af",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            fontWeight: 600
                                        }}>
                                            Pending: {timingData.pending_opening_time?.slice(0, 5)}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="time"
                                    className="form-control"
                                    value={openingTime}
                                    onChange={(e) => setOpeningTime(e.target.value)}
                                    disabled={!canEditSettings || savingTiming}
                                    required
                                />
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                                    Current effective: {timingData?.opening_time?.slice(0, 5) || "09:00"}
                                </span>
                            </div>

                            <div className="form-group">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                    <label className="form-label" style={{ margin: 0 }}>
                                        Closing Time (Daily)
                                    </label>
                                    {timingData?.has_pending_change && (
                                        <span style={{
                                            fontSize: "0.7rem",
                                            backgroundColor: "#dbeafe",
                                            color: "#1e40af",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            fontWeight: 600
                                        }}>
                                            Pending: {timingData.pending_closing_time?.slice(0, 5)}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="time"
                                    className="form-control"
                                    value={closingTime}
                                    onChange={(e) => setClosingTime(e.target.value)}
                                    disabled={!canEditSettings || savingTiming}
                                    required
                                />
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                                    Current effective: {timingData?.closing_time?.slice(0, 5) || "17:00"}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                <KeyRound size={14} color="var(--primary)" />
                                <span>2FA required • Takes effect in 7 days</span>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={!canEditSettings || savingTiming || loading}
                            >
                                <ShieldCheck size={14} />
                                <span>Save Operating Hours</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* 2. Working Days Card */}
                <div 
                    className="card"
                    style={{
                        border: workingDays.some(d => d.has_pending_change) ? "1.5px solid #3b82f6" : "1px solid var(--border)",
                        boxShadow: workingDays.some(d => d.has_pending_change) ? "0 4px 16px rgba(59, 130, 246, 0.12)" : "none"
                    }}
                >
                    <div className="card-header">
                        <span className="card-title">
                            <Calendar size={18} color="var(--primary)" />
                            Weekly Working Schedule
                        </span>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span className="badge badge-secondary">7-Day Calendar</span>
                            {workingDays.some(d => d.has_pending_change) && (
                                <span style={{
                                    fontSize: "0.7rem",
                                    backgroundColor: "#dbeafe",
                                    color: "#1e40af",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontWeight: 700
                                }}>
                                    Pending Update
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Pending Working Days Alert Banner */}
                    {workingDays.some(d => d.has_pending_change) && (
                        <div style={{
                            backgroundColor: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "8px",
                            padding: "10px 14px",
                            marginBottom: "16px",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px"
                        }}>
                            <Calendar size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: "2px" }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
                                    <strong style={{ fontSize: "0.82rem", color: "#1d4ed8" }}>
                                        ⏳ Pending Weekly Schedule Updates
                                    </strong>
                                    <span style={{
                                        fontSize: "0.7rem",
                                        backgroundColor: "#dbeafe",
                                        color: "#1e40af",
                                        padding: "2px 7px",
                                        borderRadius: "12px",
                                        fontWeight: 600
                                    }}>
                                        Effective: {formatIndianDate(workingDays.find(d => d.has_pending_change)?.effective_date)}
                                    </span>
                                </div>
                                <span style={{ fontSize: "0.74rem", color: "#3b82f6", display: "block", marginTop: "3px" }}>
                                    Bookings and slot generation prior to effective date follow currently active days.
                                </span>
                            </div>
                        </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                        {workingDays.map((item) => (
                            <div 
                                key={item.day_of_week}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "10px 14px",
                                    borderRadius: "8px",
                                    backgroundColor: item.is_working ? "var(--primary-light)" : "#f8fafc",
                                    border: `1px solid ${item.has_pending_change ? "#3b82f6" : item.is_working ? "var(--primary-border)" : "var(--border)"}`,
                                    cursor: canEditSettings ? "pointer" : "default"
                                }}
                                onClick={() => handleToggleDay(item.day_of_week)}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <span style={{ fontWeight: 600, fontSize: "0.9rem", color: item.is_working ? "var(--primary-dark)" : "var(--text-muted)" }}>
                                        {item.day_of_week}
                                    </span>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ 
                                        fontSize: "0.75rem", 
                                        fontWeight: 600, 
                                        color: item.is_working ? "var(--primary)" : "var(--danger)" 
                                    }}>
                                        {item.is_working ? "OPEN / WORKING" : "CLOSED / OFF"}
                                    </span>
                                    {item.has_pending_change && (
                                        <span style={{
                                            fontSize: "0.7rem",
                                            backgroundColor: "#dbeafe",
                                            color: "#1e40af",
                                            padding: "1px 6px",
                                            borderRadius: "4px",
                                            fontWeight: 600
                                        }}>
                                            Pending: {item.pending_is_working ? "OPEN" : "CLOSED"}
                                        </span>
                                    )}
                                    <input
                                        type="checkbox"
                                        checked={item.is_working}
                                        onChange={() => handleToggleDay(item.day_of_week)}
                                        disabled={!canEditSettings}
                                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary)" }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            <KeyRound size={14} color="var(--primary)" />
                            <span>2FA required • Takes effect in 7 days</span>
                        </div>

                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={promptSaveDays}
                            disabled={!canEditSettings || savingDays || loading}
                        >
                            <ShieldCheck size={14} />
                            <span>Save Working Days</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Two-Factor Password Verification Modal */}
            <ConfirmModal
                isOpen={verifyModal.isOpen}
                title={verifyModal.title}
                message={verifyModal.message}
                confirmText="Authorize & Save"
                confirmVariant="primary"
                loading={submittingPassword}
                onConfirm={handleExecuteVerifiedAction}
                onCancel={() => setVerifyModal(prev => ({ ...prev, isOpen: false }))}
            >
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                        Enter Verification Password:
                    </label>
                    <div style={{ position: "relative" }}>
                        <input
                            type="password"
                            placeholder="Enter administrative password"
                            value={verificationPassword}
                            onChange={(e) => setVerificationPassword(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleExecuteVerifiedAction();
                                }
                            }}
                            autoFocus
                            style={{
                                width: "100%",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                fontSize: "0.9rem",
                                outline: "none"
                            }}
                        />
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>
                        Factor 2 of 2: Confirms intentional modification of state-wide Mandi schedules.
                    </p>
                </div>
            </ConfirmModal>
        </div>
    );
}
