import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
    User, 
    ShieldCheck, 
    Phone, 
    Mail, 
    MapPin, 
    CreditCard, 
    Lock, 
    Calendar, 
    CheckCircle,
    Info,
    RefreshCw,
    IndianRupee,
    Landmark
} from "lucide-react";

export default function ProfilePage() {
    const { getProfile, user: authUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getProfile();
            if (data) {
                setProfile(data);
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
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <RefreshCw size={32} className="spin" style={{ margin: "0 auto 12px auto", color: "var(--primary-600)" }} />
                <p style={{ color: "var(--gray-500)", fontSize: "14px" }}>Loading official Payment Officer profile...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 20px" }}>
                <div className="card" style={{ padding: "32px", textAlign: "center" }}>
                    <Info size={36} color="#dc2626" style={{ margin: "0 auto 10px auto" }} />
                    <h3 style={{ color: "var(--gray-900)", marginBottom: "6px" }}>Failed to Load Profile</h3>
                    <p style={{ color: "var(--gray-500)", marginBottom: "16px" }}>{error || "Profile data unavailable"}</p>
                    <button type="button" className="btn btn-outline" onClick={loadProfile}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 20px" }}>
            {/* Header Banner */}
            <div style={{
                background: "linear-gradient(135deg, #1e40af 0%, #1e293b 100%)",
                borderRadius: "16px",
                padding: "28px 24px",
                color: "#ffffff",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    <div style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "16px",
                        background: "rgba(255, 255, 255, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#60a5fa",
                        backdropFilter: "blur(4px)"
                    }}>
                        <Landmark size={32} />
                    </div>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{
                                background: "rgba(255, 255, 255, 0.2)",
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: 700,
                                letterSpacing: "0.5px"
                            }}>
                                OFFICIAL PAYMENT OFFICER
                            </span>
                            <span style={{
                                background: profile.status === "active" ? "#16a34a" : "#dc2626",
                                color: "#ffffff",
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: 600
                            }}>
                                ● {profile.status === "active" ? "Active" : "Inactive"}
                            </span>
                        </div>
                        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                            {profile.full_name || profile.username}
                        </h1>
                        <p style={{ margin: "2px 0 0 0", fontSize: "13px", opacity: 0.85 }}>
                            @{profile.username} • User ID: #{profile.payment_user_id} • Assigned State: <strong>{profile.state?.state_name || "All States"}</strong>
                        </p>
                    </div>
                </div>

                <div style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    border: "1px solid rgba(255, 255, 255, 0.15)"
                }}>
                    <Lock size={14} color="#93c5fd" />
                    <span>Read-Only Portal Profile</span>
                </div>
            </div>

            {/* Read-Only Notice */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                fontSize: "13px",
                marginBottom: "24px"
            }}>
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>
                    This profile is official and strictly <strong>Read-Only</strong>. Personal details, telephone authentication numbers, and state jurisdictions are managed by authorized State DBA / Central Government administrators.
                </span>
            </div>

            {/* Profile Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "20px",
                marginBottom: "24px"
            }}>
                {/* Personal & Contact Details */}
                <div className="card" style={{ padding: "20px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--gray-900)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <User size={18} color="var(--primary-600)" />
                        Personal & Contact Details
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase" }}>Full Name</span>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--gray-900)", marginTop: "2px" }}>
                                {profile.full_name || "N/A"}
                            </div>
                        </div>

                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase" }}>Registered Mobile (Login Identifier)</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 600, color: "var(--gray-900)", marginTop: "2px" }}>
                                <Phone size={14} color="#16a34a" />
                                <span>+91 {profile.phone_number || "Not Registered"}</span>
                                <span style={{ fontSize: "10.5px", background: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                                    OTP Verified
                                </span>
                            </div>
                        </div>

                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase" }}>Official Email</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "var(--gray-900)", marginTop: "2px" }}>
                                <Mail size={14} color="var(--gray-400)" />
                                <span>{profile.email || "N/A"}</span>
                            </div>
                        </div>

                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase" }}>Office / Official Address</span>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "13.5px", color: "var(--gray-900)", marginTop: "2px" }}>
                                <MapPin size={14} color="var(--gray-400)" style={{ marginTop: "3px", flexShrink: 0 }} />
                                <span>{profile.address || "N/A"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* State Jurisdiction & Identity Security */}
                <div className="card" style={{ padding: "20px" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--gray-900)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <ShieldCheck size={18} color="#16a34a" />
                        Jurisdiction & Identity Security
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase" }}>Assigned State Jurisdiction</span>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary-700)", marginTop: "2px" }}>
                                {profile.state?.state_name} ({profile.state?.state_code})
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--gray-500)" }}>
                                Strict State Isolation enforced. Only payments within this state are accessible.
                            </span>
                        </div>

                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase" }}>Aadhaar Verification Status</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                                <CreditCard size={15} color="#16a34a" />
                                <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "monospace", color: "var(--gray-900)" }}>
                                    {profile.masked_aadhaar}
                                </span>
                                <span style={{ fontSize: "10.5px", background: "#f0fdf4", color: "#166534", padding: "1px 6px", borderRadius: "4px", border: "1px solid #bbf7d0", fontWeight: 600 }}>
                                    HMAC Blind-Indexed
                                </span>
                            </div>
                            <span style={{ fontSize: "11px", color: "var(--gray-500)" }}>
                                Plaintext Aadhaar is never stored; secured via HMAC-SHA256 blind index pepper.
                            </span>
                        </div>

                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase" }}>Account Role</span>
                            <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--gray-900)", marginTop: "2px" }}>
                                {profile.role || "PAYMENT_OFFICER"}
                            </div>
                        </div>

                        <div>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--gray-500)", textTransform: "uppercase" }}>Registration Date</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--gray-600)", marginTop: "2px" }}>
                                <Calendar size={13} color="var(--gray-400)" />
                                <span>{profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Permissions Card */}
            <div className="card" style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--gray-900)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Lock size={17} color="var(--primary-600)" />
                    Assigned Portal Permissions
                </h3>

                {profile.permissions && profile.permissions.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {profile.permissions.map((perm, idx) => (
                            <span
                                key={idx}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    background: "#f1f5f9",
                                    color: "#334155",
                                    border: "1px solid #e2e8f0"
                                }}
                            >
                                <CheckCircle size={12} color="#16a34a" />
                                {perm}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: "var(--gray-500)", fontSize: "13px", margin: 0 }}>
                        Standard payment processing and lookup permissions assigned.
                    </p>
                )}
            </div>
        </div>
    );
}
