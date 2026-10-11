import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
    User, 
    ShieldCheck, 
    Phone, 
    Mail, 
    MapPin, 
    Store, 
    Layers, 
    Lock, 
    Calendar, 
    CheckCircle,
    Info,
    RefreshCw
} from "lucide-react";

export default function Profile() {
    const { getProfile, user: authUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getProfile();
            if (res && res.success && res.data) {
                setProfile(res.data);
            } else {
                setError("Unable to load profile from server.");
            }
        } catch (err) {
            setError(err.message || "Failed to load user profile");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    if (loading) {
        return (
            <div className="main-content" style={{ textAlign: "center", padding: "60px 20px" }}>
                <RefreshCw size={32} className="spin" style={{ margin: "0 auto 12px auto", color: "var(--primary)" }} />
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading official Mandi user profile...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="main-content">
                <div className="card" style={{ padding: "30px", textAlign: "center" }}>
                    <Info size={36} color="var(--danger)" style={{ margin: "0 auto 10px auto" }} />
                    <h3 style={{ color: "var(--text-main)", marginBottom: "6px" }}>Failed to Load Profile</h3>
                    <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>{error || "Profile data unavailable"}</p>
                    <button type="button" className="btn btn-outline btn-sm" onClick={loadProfile}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="main-content" style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 16px" }}>
            {/* Header Banner */}
            <div className="card" style={{ marginBottom: "24px", overflow: "hidden" }}>
                <div style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                    padding: "28px 24px",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "16px"
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                        <div style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "16px",
                            background: "rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "28px",
                            backdropFilter: "blur(4px)"
                        }}>
                            🏪
                        </div>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                <span style={{
                                    background: "rgba(255, 255, 255, 0.25)",
                                    fontSize: "0.72rem",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    letterSpacing: "0.5px"
                                }}>
                                    OFFICIAL MANDI OPERATOR
                                </span>
                                <span style={{
                                    background: profile.status === "active" ? "#22c55e" : "#ef4444",
                                    color: "#ffffff",
                                    fontSize: "0.72rem",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontWeight: 600
                                }}>
                                    ● {profile.status === "active" ? "Active" : "Inactive"}
                                </span>
                            </div>
                            <h1 style={{ fontSize: "1.45rem", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                                {profile.full_name || profile.username}
                            </h1>
                            <p style={{ margin: "4px 0 0 0", opacity: 0.9, fontSize: "0.85rem" }}>
                                User ID: #{profile.user_id} • {profile.mandi?.mandi_name || "Mandi Station"}
                            </p>
                        </div>
                    </div>

                    <div style={{
                        background: "rgba(255, 255, 255, 0.15)",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        border: "1px solid rgba(255, 255, 255, 0.25)"
                    }}>
                        🔒 Read-Only Identity Record
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
                {/* 1. Account & Contact Details */}
                <div className="card" style={{ padding: "20px" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <User size={18} color="var(--primary)" /> Personal & Contact Information
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                System Username
                            </span>
                            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)" }}>
                                {profile.username}
                            </span>
                        </div>

                        <div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Registered Phone Number (Login Identifier)
                            </span>
                            <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "var(--primary-light)",
                                border: "1px solid var(--primary-border)",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                color: "var(--primary-dark)",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                marginTop: "3px"
                            }}>
                                <Phone size={14} /> +91 {profile.phone_number}
                            </div>
                        </div>

                        <div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Email Address
                            </span>
                            <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                                {profile.email || "N/A"}
                            </span>
                        </div>
                        <div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Station / Office Address
                            </span>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                                {profile.address || "Mandi Operational Yard Complex"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Assigned Mandi & Location */}
                <div className="card" style={{ padding: "20px" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Store size={18} color="var(--primary)" /> Assigned Mandi & Jurisdiction
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Mandi Name & ID
                            </span>
                            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--primary-dark)" }}>
                                {profile.mandi?.mandi_name} (#{profile.mandi?.mandi_id})
                            </span>
                        </div>

                        <div>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Mandi Yard Location
                            </span>
                            <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                                {profile.mandi?.mandi_location || "Standard Yard"}
                            </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                    District
                                </span>
                                <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                                    {profile.mandi?.district || "N/A"}
                                </span>
                            </div>
                            <div>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                    State
                                </span>
                                <span style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                                    {profile.mandi?.state || "N/A"}
                                </span>
                            </div>
                        </div>

                        <div style={{ marginTop: "6px" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block" }}>
                                Operational Role
                            </span>
                            <span className="badge badge-primary" style={{ padding: "6px 12px", fontSize: "0.825rem", marginTop: "4px" }}>
                                {String(profile.role).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Assigned Counters & Permissions */}
            <div className="card" style={{ marginTop: "20px", padding: "20px" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={18} color="var(--primary)" /> Assigned Service Counters
                </h3>

                {Array.isArray(profile.counters) && profile.counters.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                        {profile.counters.map(counter => (
                            <div key={counter.counter_id} style={{
                                padding: "14px 16px",
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                background: "var(--bg-main)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <strong style={{ color: "var(--primary-dark)", fontSize: "0.95rem" }}>
                                        Counter {counter.counter_number}
                                    </strong>
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                        ID #{counter.counter_id}
                                    </span>
                                </div>
                                <span style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                                    {counter.counter_name}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    Crop: <strong>{counter.crop_name}</strong>
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No specific counters assigned to this user.</p>
                )}

                <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "8px" }}>
                        Authorized Functional Permissions
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {Array.isArray(profile.permissions) && profile.permissions.length > 0 ? (
                            profile.permissions.map((p, i) => (
                                <span key={i} className="badge badge-info" style={{ padding: "5px 10px", fontSize: "0.8rem" }}>
                                    ✓ {p}
                                </span>
                            ))
                        ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Standard Operator Access</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Read-Only Notice */}
            <div style={{
                marginTop: "16px",
                padding: "12px 18px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
            }}>
                <ShieldCheck size={16} color="var(--primary)" />
                <span>
                    This profile is strictly read-only. For counter reassignments or mobile number updates, contact your Mandi Administrator or Government Portal DBA.
                </span>
            </div>
        </div>
    );
}
