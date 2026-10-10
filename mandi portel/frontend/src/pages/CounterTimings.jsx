import React, { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ConfirmModal from "../components/ConfirmModal";
import { formatIndianDate } from "../utils/dateUtils";
import { 
    Clock, 
    Layers, 
    ShieldCheck, 
    Lock, 
    RefreshCw, 
    KeyRound, 
    CheckCircle2, 
    Wheat, 
    Building2,
    Calendar,
    Save,
    Sparkles
} from "lucide-react";

export default function CounterTimings() {
    const { user, mandi } = useAuth();
    const toast = useToast();

    const [counters, setCounters] = useState([]);
    const [mandiInfo, setMandiInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [draftTimes, setDraftTimes] = useState({}); // { [counter_id]: number }
    const [updatingCounterId, setUpdatingCounterId] = useState(null);

    // Password verification modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCounter, setSelectedCounter] = useState(null);
    const [targetDuration, setTargetDuration] = useState(15);
    const [verificationPassword, setVerificationPassword] = useState("");
    const [submittingPassword, setSubmittingPassword] = useState(false);

    // Mandi operator authorization check
    const isMandiOperator = user?.role === "mandi_operator";
    const hasUpdatePermission = Array.isArray(user?.permissions) ? user.permissions.includes("update") : true;
    const canEdit = isMandiOperator && hasUpdatePermission;

    const fetchCounterTimings = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/counters/avg-time");
            if (res.success) {
                setCounters(res.data || []);
                setMandiInfo(res.mandi || mandi);

                // Initialize draft times
                const initialDrafts = {};
                (res.data || []).forEach(c => {
                    initialDrafts[c.counter_id] = c.avg_time_minutes || 15;
                });
                setDraftTimes(initialDrafts);
            } else {
                toast.error(res.message || "Failed to load counter timings");
            }
        } catch (err) {
            console.error("fetchCounterTimings error:", err);
            toast.error("Failed to fetch counter average procurement times");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCounterTimings();
    }, []);

    const handleDurationChange = (counterId, delta) => {
        if (!canEdit) return;
        setDraftTimes(prev => {
            const current = prev[counterId] || 15;
            const updated = Math.min(120, Math.max(5, current + delta));
            return { ...prev, [counterId]: updated };
        });
    };

    const handleManualInputChange = (counterId, value) => {
        if (!canEdit) return;
        const val = parseInt(value, 10);
        if (isNaN(val)) {
            setDraftTimes(prev => ({ ...prev, [counterId]: "" }));
            return;
        }
        setDraftTimes(prev => ({ ...prev, [counterId]: Math.min(240, Math.max(1, val)) }));
    };

    const setPreset = (counterId, mins) => {
        if (!canEdit) return;
        setDraftTimes(prev => ({ ...prev, [counterId]: mins }));
    };

    const initiateUpdate = (counter) => {
        if (!canEdit) {
            toast.error("Only mandi operators can modify counter average procurement timings.");
            return;
        }

        const duration = parseInt(draftTimes[counter.counter_id], 10);
        if (isNaN(duration) || duration < 1 || duration > 240) {
            toast.error("Please enter a valid procurement duration between 1 and 240 minutes.");
            return;
        }

        setSelectedCounter(counter);
        setTargetDuration(duration);
        setVerificationPassword("");
        setModalOpen(true);
    };

    const handleExecuteUpdate = async () => {
        if (!verificationPassword || !verificationPassword.trim()) {
            toast.error("Verification password is required.");
            return;
        }

        if (!selectedCounter) return;

        setSubmittingPassword(true);
        try {
            const res = await apiFetch(`/api/counters/${selectedCounter.counter_id}/avg-time`, {
                method: "PATCH",
                body: {
                    avg_time_minutes: targetDuration,
                    password: verificationPassword
                }
            });

            if (res.success) {
                toast.success(res.message || `Counter #${selectedCounter.counter_number} average procurement time updated to ${targetDuration} mins.`);
                setModalOpen(false);

                // Update local counters list
                setCounters(prev => prev.map(c => {
                    if (c.counter_id === selectedCounter.counter_id) {
                        return {
                            ...c,
                            has_pending_change: true,
                            pending_avg_time: targetDuration,
                            effective_date: res.data?.effective_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            timing_updated_at: new Date().toISOString(),
                            updated_by_username: user?.username || "You"
                        };
                    }
                    return c;
                }));
            } else {
                toast.error(res.message || "Failed to update timing");
            }
        } catch (err) {
            toast.error(err.message || "Password verification failed or network error.");
        } finally {
            setSubmittingPassword(false);
        }
    };

    return (
        <div className="main-content">
            {/* Page Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.4rem", fontWeight: 700, color: "var(--text-main)" }}>
                        <Clock size={24} color="var(--primary)" />
                        Counter Average Procurement Timings
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "3px" }}>
                        Configure and manage the average processing duration per farmer for counters of this Mandi facility only.
                    </p>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={fetchCounterTimings}
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? "spin" : ""} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Mandi Facility Context Badge Banner */}
            <div style={{
                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(21, 128, 61, 0.04) 100%)",
                border: "1px solid rgba(34, 197, 94, 0.25)",
                borderRadius: "10px",
                padding: "16px 20px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        backgroundColor: "var(--primary)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                        boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)"
                    }}>
                        <Building2 size={22} />
                    </div>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                                {mandiInfo?.mandi_name || mandi?.mandi_name || `Mandi Facility #${user?.mandi_id}`}
                            </h3>
                            <span className="badge badge-primary" style={{ fontSize: "0.72rem" }}>
                                Mandi #{user?.mandi_id}
                            </span>
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                            State: <strong>{mandiInfo?.state_name || mandi?.state_name || "Assigned State"}</strong>
                            {mandiInfo?.capacity ? ` • Total Facility Intake Capacity: ${mandiInfo.capacity} MT/day (${(parseFloat(mandiInfo.capacity) * 10).toFixed(1)} Qtl)` : ""}
                        </p>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                        fontSize: "0.78rem",
                        padding: "4px 10px",
                        backgroundColor: "#ecfdf5",
                        color: "#065f46",
                        border: "1px solid #a7f3d0",
                        borderRadius: "20px",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px"
                    }}>
                        <ShieldCheck size={14} color="#059669" />
                        Scoped to this Mandi Only
                    </span>
                </div>
            </div>

            {/* Operator Permission Banner */}
            {!canEdit && (
                <div className="alert alert-warning" style={{ marginBottom: "20px" }}>
                    <Lock size={18} style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: "0.85rem" }}>
                        <strong>View-Only Notice:</strong> You are logged in with role <code>{user?.role || "mandi_user"}</code>. Only authorized <code>mandi_operator</code> personnel can modify counter average procurement duration.
                    </div>
                </div>
            )}

            {/* Counters Table / Cards */}
            {loading ? (
                <div style={{
                    padding: "40px",
                    textAlign: "center",
                    backgroundColor: "#fff",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)"
                }}>
                    <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px" }} />
                    <p>Loading counter timings for {mandiInfo?.mandi_name || "Mandi"}...</p>
                </div>
            ) : counters.length === 0 ? (
                <div style={{
                    padding: "40px",
                    textAlign: "center",
                    backgroundColor: "#fff",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)"
                }}>
                    <Layers size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                    <p style={{ fontWeight: 600 }}>No counters configured for this Mandi yet.</p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
                    {counters.map(counter => {
                        const currentAvg = counter.current_avg_time || counter.avg_time_minutes || 15;
                        const pendingAvg = counter.pending_avg_time;
                        const effectiveDate = counter.effective_date;
                        const hasPending = Boolean(counter.has_pending_change);
                        const draftValue = draftTimes[counter.counter_id] ?? currentAvg;
                        const isModified = draftValue !== currentAvg && draftValue !== pendingAvg;

                        return (
                            <div 
                                key={counter.counter_id} 
                                className="card"
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    position: "relative",
                                    overflow: "hidden",
                                    border: hasPending ? "1.5px solid #3b82f6" : isModified ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                                    boxShadow: hasPending ? "0 4px 16px rgba(59, 130, 246, 0.12)" : isModified ? "0 4px 16px rgba(34, 197, 94, 0.12)" : "var(--shadow-sm)"
                                }}
                            >
                                <div>
                                    {/* Counter Header */}
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        marginBottom: "14px",
                                        paddingBottom: "12px",
                                        borderBottom: "1px solid var(--border)"
                                    }}>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{
                                                    fontSize: "0.85rem",
                                                    fontWeight: 700,
                                                    backgroundColor: "var(--primary-light)",
                                                    color: "var(--primary-dark)",
                                                    padding: "2px 8px",
                                                    borderRadius: "6px"
                                                }}>
                                                    Counter #{counter.counter_number}
                                                </span>
                                                <span style={{
                                                    fontSize: "0.72rem",
                                                    fontWeight: 600,
                                                    padding: "2px 6px",
                                                    borderRadius: "4px",
                                                    backgroundColor: counter.status === "ACTIVE" ? "#dcfce7" : "#f1f5f9",
                                                    color: counter.status === "ACTIVE" ? "#166534" : "#64748b"
                                                }}>
                                                    {counter.status || "ACTIVE"}
                                                </span>
                                                {hasPending && (
                                                    <span style={{
                                                        fontSize: "0.7rem",
                                                        fontWeight: 700,
                                                        padding: "2px 6px",
                                                        borderRadius: "4px",
                                                        backgroundColor: "#dbeafe",
                                                        color: "#1e40af"
                                                    }}>
                                                        Pending Update
                                                    </span>
                                                )}
                                            </div>
                                            <h4 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "6px 0 0 0", color: "var(--text-main)" }}>
                                                {counter.counter_name}
                                            </h4>
                                        </div>

                                        <div style={{ textAlign: "right" }}>
                                            <span style={{ 
                                                fontSize: "0.75rem", 
                                                fontWeight: 600, 
                                                color: "var(--text-muted)", 
                                                display: "block" 
                                            }}>
                                                Daily Intake Limit
                                            </span>
                                            <strong style={{ fontSize: "0.95rem", color: "var(--text-main)" }}>
                                                {counter.capacity_per_day} <span style={{ fontSize: "0.75rem", fontWeight: 500 }}>MT/day</span>
                                            </strong>
                                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
                                                ({(parseFloat(counter.capacity_per_day || 0) * 10).toFixed(1)} Qtl)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Crop Assigned */}
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        backgroundColor: "#f8fafc",
                                        padding: "8px 12px",
                                        borderRadius: "6px",
                                        border: "1px solid var(--border)",
                                        marginBottom: "16px",
                                        fontSize: "0.82rem"
                                    }}>
                                        <Wheat size={16} color="var(--primary)" />
                                        <span style={{ color: "var(--text-muted)" }}>Crop Assigned:</span>
                                        <strong style={{ color: "var(--text-main)" }}>{counter.crop_name}</strong>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                                            ({counter.crop_type})
                                        </span>
                                    </div>

                                    {/* Current Configured Average Time Info */}
                                    <div style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: hasPending ? "10px" : "16px",
                                        padding: "10px 14px",
                                        backgroundColor: "var(--primary-light)",
                                        borderRadius: "8px",
                                        border: "1px solid var(--primary-border)"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <Clock size={18} color="var(--primary-dark)" />
                                            <div>
                                                <span style={{ fontSize: "0.75rem", color: "var(--primary-dark)", display: "block", fontWeight: 600 }}>
                                                    Current Effective Duration
                                                </span>
                                                <strong style={{ fontSize: "1.1rem", color: "var(--primary-dark)" }}>
                                                    {currentAvg} <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>minutes / farmer</span>
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pending Change Indicator Banner (7-Day Delay) */}
                                    {hasPending && (
                                        <div style={{
                                            backgroundColor: "#eff6ff",
                                            border: "1px solid #bfdbfe",
                                            borderRadius: "8px",
                                            padding: "10px 12px",
                                            marginBottom: "16px",
                                            display: "flex",
                                            alignItems: "flex-start",
                                            gap: "10px"
                                        }}>
                                            <Calendar size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: "2px" }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
                                                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1d4ed8" }}>
                                                        ⏳ Pending 7-Day Delay Update
                                                    </span>
                                                    <span style={{
                                                        fontSize: "0.7rem",
                                                        backgroundColor: "#dbeafe",
                                                        color: "#1e40af",
                                                        padding: "1px 6px",
                                                        borderRadius: "4px",
                                                        fontWeight: 600
                                                    }}>
                                                        Effective: {formatIndianDate(effectiveDate)}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: "0.82rem", color: "#1e3a8a", margin: "3px 0 2px 0" }}>
                                                    Configured: <strong>{pendingAvg} minutes / farmer</strong>
                                                </p>
                                                <span style={{ fontSize: "0.72rem", color: "#3b82f6", display: "block" }}>
                                                    Slots until {formatIndianDate(effectiveDate)} use currently effective {currentAvg}m.
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Duration Adjuster Form */}
                                    <div style={{ marginBottom: "16px" }}>
                                        <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "8px" }}>
                                            Adjust Average Processing Time (Minutes):
                                        </label>

                                        {/* Stepper & Input */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleDurationChange(counter.counter_id, -5)}
                                                disabled={!canEdit || draftValue <= 5}
                                                style={{ width: "36px", height: "36px", padding: 0, fontSize: "1.1rem", fontWeight: 700 }}
                                                title="Decrease 5 mins"
                                            >
                                                −
                                            </button>

                                            <div style={{ position: "relative", flex: 1 }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="240"
                                                    className="form-control"
                                                    value={draftValue}
                                                    onChange={(e) => handleManualInputChange(counter.counter_id, e.target.value)}
                                                    disabled={!canEdit}
                                                    style={{
                                                        textAlign: "center",
                                                        fontSize: "1.1rem",
                                                        fontWeight: 700,
                                                        color: "var(--text-main)"
                                                    }}
                                                />
                                                <span style={{
                                                    position: "absolute",
                                                    right: "12px",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    fontSize: "0.75rem",
                                                    color: "var(--text-muted)",
                                                    pointerEvents: "none"
                                                }}>
                                                    mins
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleDurationChange(counter.counter_id, 5)}
                                                disabled={!canEdit || draftValue >= 120}
                                                style={{ width: "36px", height: "36px", padding: 0, fontSize: "1.1rem", fontWeight: 700 }}
                                                title="Increase 5 mins"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Quick Preset Buttons */}
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                            {[10, 15, 20, 25, 30, 45].map(mins => (
                                                <button
                                                    key={mins}
                                                    type="button"
                                                    onClick={() => setPreset(counter.counter_id, mins)}
                                                    disabled={!canEdit}
                                                    style={{
                                                        border: "1px solid var(--border)",
                                                        backgroundColor: draftValue === mins ? "var(--primary)" : "#fff",
                                                        color: draftValue === mins ? "#fff" : "var(--text-muted)",
                                                        borderRadius: "4px",
                                                        padding: "3px 8px",
                                                        fontSize: "0.75rem",
                                                        fontWeight: draftValue === mins ? 700 : 500,
                                                        cursor: canEdit ? "pointer" : "default",
                                                        transition: "all 0.15s ease"
                                                    }}
                                                >
                                                    {mins}m
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer & Action */}
                                <div style={{
                                    borderTop: "1px solid var(--border)",
                                    paddingTop: "12px",
                                    marginTop: "12px"
                                }}>
                                    {/* Last updated audit info */}
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "10px" }}>
                                        {counter.timing_updated_at ? (
                                            <span>
                                                Updated {formatIndianDate(counter.timing_updated_at)} by <strong>{counter.updated_by_username || "Operator"}</strong>
                                            </span>
                                        ) : (
                                            <span>Default operational average (15 mins)</span>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        className={`btn ${isModified ? "btn-primary" : "btn-outline"} btn-sm`}
                                        style={{ width: "100%", justifyContent: "center" }}
                                        onClick={() => initiateUpdate(counter)}
                                        disabled={!canEdit || !isModified}
                                    >
                                        <KeyRound size={14} />
                                        <span>{isModified ? "Authorize & Update Time" : "No Change (Current: " + currentAvg + "m)"}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Password Verification Modal */}
            <ConfirmModal
                isOpen={modalOpen}
                title="Authorize Counter Timing Update"
                message={`You are updating the average procurement duration for Counter #${selectedCounter?.counter_number} (${selectedCounter?.counter_name}) to ${targetDuration} minutes.`}
                confirmText="Authorize & Save"
                confirmVariant="primary"
                loading={submittingPassword}
                onConfirm={handleExecuteUpdate}
                onCancel={() => setModalOpen(false)}
            >
                <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                    <div style={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid var(--border)",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        marginBottom: "12px",
                        fontSize: "0.82rem"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ color: "var(--text-muted)" }}>Target Mandi:</span>
                            <strong>{mandiInfo?.mandi_name || mandi?.mandi_name}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ color: "var(--text-muted)" }}>Counter:</span>
                            <strong>#{selectedCounter?.counter_number} - {selectedCounter?.counter_name}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-muted)" }}>New Procurement Time:</span>
                            <strong style={{ color: "var(--primary)" }}>{targetDuration} minutes / farmer</strong>
                        </div>
                    </div>

                    <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                        Enter Mandi Operator Verification Password:
                    </label>
                    <input
                        type="password"
                        placeholder="Enter administrative password"
                        value={verificationPassword}
                        onChange={(e) => setVerificationPassword(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleExecuteUpdate();
                            }
                        }}
                        autoFocus
                        style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            fontSize: "0.9rem",
                            outline: "none"
                        }}
                    />
                    <p style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "6px" }}>
                        Authorized role: <strong>mandi_operator</strong>. Password verification required before writing to procurement scheduling.
                    </p>
                </div>
            </ConfirmModal>
        </div>
    );
}
