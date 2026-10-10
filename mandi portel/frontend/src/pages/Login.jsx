import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Store, Phone, KeyRound, AlertCircle, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";

export default function Login() {
    const { requestOtp, verifyOtp } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    // OTP states
    const [step, setStep] = useState(1); // 1: phone, 2: OTP
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [timer, setTimer] = useState(300); // 5 mins in seconds
    const [canResend, setCanResend] = useState(false);

    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Timer effect for Step 2
    useEffect(() => {
        let interval = null;
        if (step === 2 && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (step === 2 && timer === 0) {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    // Step 1: Request OTP
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setError(null);

        const cleanPhone = phone.trim().replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
            setError("Please enter a valid 10-digit registered mobile number");
            return;
        }

        setSubmitting(true);
        try {
            const res = await requestOtp(cleanPhone);
            if (res && res.success) {
                setStep(2);
                setTimer(300);
                setCanResend(false);
                const mockOtp = res.otp || res.mock_otp || res.data?.otp;
                if (mockOtp) {
                    setOtp(String(mockOtp));
                }
                toast.success(res.message || "OTP sent to your registered mobile number");
            } else {
                setError(res?.message || "Failed to request OTP. Please verify your registered number.");
            }
        } catch (err) {
            setError(err.message || "Failed to request OTP. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError(null);

        const cleanOtp = otp.trim();
        if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }

        setSubmitting(true);
        try {
            const cleanPhone = phone.trim().replace(/\D/g, "");
            const res = await verifyOtp(cleanPhone, cleanOtp);
            if (res && res.success) {
                toast.success("Welcome back! Signed in successfully.");
                navigate("/");
            } else {
                setError(res?.message || "Invalid OTP. Please check and try again.");
            }
        } catch (err) {
            setError(err.message || "OTP verification failed. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Resend OTP
    const handleResendOtp = async () => {
        if (!canResend && timer > 270) return;
        setError(null);
        setSubmitting(true);
        try {
            const cleanPhone = phone.trim().replace(/\D/g, "");
            const res = await requestOtp(cleanPhone);
            if (res && res.success) {
                setTimer(300);
                setCanResend(false);
                const mockOtp = res.otp || res.mock_otp || res.data?.otp;
                if (mockOtp) {
                    setOtp(String(mockOtp));
                } else {
                    setOtp("");
                }
                toast.success("New OTP sent successfully");
            } else {
                setError(res?.message || "Failed to resend OTP");
            }
        } catch (err) {
            setError(err.message || "Failed to resend OTP");
        } finally {
            setSubmitting(false);
        }
    };

    const formatTimer = (sec) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8fafc",
            backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            padding: "20px"
        }}>
            <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid var(--border)",
                boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
                width: "100%",
                maxWidth: "420px",
                padding: "36px 32px",
                position: "relative"
            }}>
                {/* Branding Header */}
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <div style={{
                        width: "56px",
                        height: "56px",
                        background: "var(--primary-light)",
                        borderRadius: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--primary)",
                        margin: "0 auto 12px",
                        border: "1px solid var(--primary-border)"
                    }}>
                        <Store size={28} />
                    </div>
                    <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                        Mandi Operations Portal
                    </h2>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.825rem", marginTop: "4px" }}>
                        Official Procurement & Counter Staff Login
                    </p>
                </div>

                {/* Form Title */}
                <div style={{ marginBottom: "16px" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-main)" }}>
                        Mobile OTP Authentication
                    </span>
                    <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                        Authenticate securely via your registered mobile number
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: "20px" }}>
                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: "0.85rem" }}>{error}</span>
                    </div>
                )}

                {/* OTP Mode Form */}
                {step === 1 ? (
                    <form onSubmit={handleRequestOtp}>
                        <div className="form-group" style={{ marginBottom: "20px" }}>
                            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Phone size={14} color="var(--primary)" /> Registered Mobile Number
                            </label>
                            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <span style={{ position: "absolute", left: "12px", fontWeight: 600, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    required
                                    className="form-control"
                                    placeholder="10-digit registered number"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                    disabled={submitting}
                                    autoComplete="tel"
                                    style={{ paddingLeft: "46px", fontSize: "1rem", letterSpacing: "1px" }}
                                    autoFocus
                                />
                            </div>
                            <small style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "4px", display: "block" }}>
                                Registered phone number is your official login identifier.
                            </small>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: "100%", padding: "11px", fontSize: "0.95rem", gap: "8px" }}
                            disabled={submitting || phone.length !== 10}
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw size={14} className="spin" />
                                    <span>Sending OTP...</span>
                                </>
                            ) : (
                                <>
                                    <span>Send Login OTP</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "var(--bg-main)",
                            border: "1px solid var(--border)",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            marginBottom: "16px",
                            fontSize: "0.825rem"
                        }}>
                            <div>
                                <span style={{ color: "var(--text-muted)" }}>OTP dispatched to: </span>
                                <strong style={{ color: "var(--text-main)" }}>+91 {phone}</strong>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setOtp("");
                                    setError(null);
                                }}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--primary)",
                                    fontSize: "0.775rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px"
                                }}
                            >
                                <ArrowLeft size={12} />
                                <span>Change</span>
                            </button>
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <KeyRound size={14} color="var(--primary)" /> Enter 6-Digit OTP
                            </label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                className="form-control"
                                placeholder="• • • • • •"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                disabled={submitting}
                                style={{
                                    textAlign: "center",
                                    fontSize: "1.4rem",
                                    letterSpacing: "8px",
                                    fontWeight: 700,
                                    fontFamily: "monospace"
                                }}
                                autoFocus
                            />
                        </div>

                        {/* Timer & Resend */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "20px",
                            fontSize: "0.8rem",
                            color: "var(--text-muted)"
                        }}>
                            <span>
                                {timer > 0 ? (
                                    <>Valid for: <strong style={{ color: "var(--text-main)" }}>{formatTimer(timer)}</strong></>
                                ) : (
                                    <span style={{ color: "var(--danger)" }}>OTP Expired</span>
                                )}
                            </span>

                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={!canResend || submitting}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: canResend ? "var(--primary)" : "var(--text-light)",
                                    cursor: canResend ? "pointer" : "not-allowed",
                                    fontWeight: 600,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "0.8rem"
                                }}
                            >
                                <RefreshCw size={12} className={submitting ? "spin" : ""} />
                                <span>Resend OTP</span>
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: "100%", padding: "11px", fontSize: "0.95rem", gap: "8px" }}
                            disabled={submitting || otp.length !== 6}
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw size={14} className="spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <span>Verify & Enter Dashboard</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Footer Security Badge */}
                <div style={{
                    marginTop: "20px",
                    textAlign: "center",
                    fontSize: "0.75rem",
                    color: "var(--text-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px"
                }}>
                    <ShieldCheck size={14} color="var(--primary)" />
                    <span>Authorized access only. 6-digit OTP verification enforced.</span>
                </div>
            </div>
        </div>
    );
}
