import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
    IndianRupee, 
    ShieldCheck, 
    AlertCircle, 
    Loader2, 
    Phone, 
    KeyRound, 
    ArrowRight, 
    ArrowLeft, 
    RefreshCw 
} from "lucide-react";

export default function LoginPage() {
    const { user, requestOtp, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1); 
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [timer, setTimer] = useState(300); 
    const [canResend, setCanResend] = useState(false);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [remainingAttempts, setRemainingAttempts] = useState(null);
    const [maxAttempts, setMaxAttempts] = useState(null);
    const [isLocked, setIsLocked] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user) {
            navigate("/dashboard", { replace: true });
        }
    }, [user, navigate]);

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

    useEffect(() => {
        let interval = null;
        if (cooldownSeconds > 0) {
            interval = setInterval(() => {
                setCooldownSeconds((prev) => {
                    if (prev <= 1) {
                        setIsLocked(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [cooldownSeconds]);

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (cooldownSeconds > 0) return;
        setError("");

        const cleanPhone = phone.trim().replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
            setError("Please enter a valid 10-digit registered mobile number");
            return;
        }

        setLoading(true);
        try {
            const res = await requestOtp(cleanPhone);
            if (res && res.success) {
                setStep(2);
                setTimer(300);
                setCanResend(false);
                if (res.remaining_attempts !== undefined) setRemainingAttempts(res.remaining_attempts);
                if (res.max_attempts !== undefined) setMaxAttempts(res.max_attempts);
                const mockOtp = res.otp || res.mock_otp || res.data?.otp;
                if (mockOtp) {
                    setOtp(String(mockOtp));
                } else {
                    setOtp("");
                }
            } else {
                setError(res?.message || "Failed to send OTP. Please verify your registered number.");
                if (res?.retry_after || res?.cooldown_seconds) {
                    setCooldownSeconds(res.cooldown_seconds || res.retry_after);
                    setIsLocked(Boolean(res.is_locked));
                }
            }
        } catch (err) {
            const errData = err.data;
            if (errData?.retry_after || errData?.cooldown_seconds) {
                setCooldownSeconds(errData.cooldown_seconds || errData.retry_after);
                setIsLocked(Boolean(errData.is_locked));
            }
            if (errData?.remaining_attempts !== undefined) {
                setRemainingAttempts(errData.remaining_attempts);
            }
            setError(err.message || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (isLocked || cooldownSeconds > 0) return;
        setError("");

        const cleanOtp = otp.trim();
        if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
            setError("Please enter a valid 6-digit numeric OTP");
            return;
        }

        setLoading(true);
        try {
            const cleanPhone = phone.trim().replace(/\D/g, "");
            await verifyOtp(cleanPhone, cleanOtp);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            const errData = err.data;
            if (errData?.remaining_attempts !== undefined) {
                setRemainingAttempts(errData.remaining_attempts);
            }
            if (errData?.max_attempts !== undefined) {
                setMaxAttempts(errData.max_attempts);
            }
            if (errData?.retry_after || errData?.cooldown_seconds) {
                setCooldownSeconds(errData.cooldown_seconds || errData.retry_after);
                setIsLocked(Boolean(errData.is_locked));
            }
            setError(err.message || "Invalid OTP. Please check and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!canResend && timer > 270) return;
        if (cooldownSeconds > 0) return;
        setError("");
        setLoading(true);
        try {
            const cleanPhone = phone.trim().replace(/\D/g, "");
            const res = await requestOtp(cleanPhone);
            if (res && res.success) {
                setTimer(300);
                setCanResend(false);
                if (res.remaining_attempts !== undefined) setRemainingAttempts(res.remaining_attempts);
                if (res.max_attempts !== undefined) setMaxAttempts(res.max_attempts);
                const mockOtp = res.otp || res.mock_otp || res.data?.otp;
                if (mockOtp) {
                    setOtp(String(mockOtp));
                } else {
                    setOtp("");
                }
            } else {
                setError(res?.message || "Failed to resend OTP");
                if (res?.retry_after || res?.cooldown_seconds) {
                    setCooldownSeconds(res.cooldown_seconds || res.retry_after);
                    setIsLocked(Boolean(res.is_locked));
                }
            }
        } catch (err) {
            const errData = err.data;
            if (errData?.retry_after || errData?.cooldown_seconds) {
                setCooldownSeconds(errData.cooldown_seconds || errData.retry_after);
                setIsLocked(Boolean(errData.is_locked));
            }
            if (errData?.remaining_attempts !== undefined) {
                setRemainingAttempts(errData.remaining_attempts);
            }
            setError(err.message || "Failed to resend OTP");
        } finally {
            setLoading(false);
        }
    };

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f172a",
            padding: "20px",
            backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)",
            backgroundSize: "24px 24px"
        }}>
            <div style={{
                maxWidth: "440px",
                width: "100%",
                background: "#ffffff",
                borderRadius: "16px",
                padding: "36px 32px",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)"
            }}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                    <div style={{
                        width: "56px",
                        height: "56px",
                        background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                        borderRadius: "14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        margin: "0 auto 14px",
                        boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)"
                    }}>
                        <IndianRupee size={30} />
                    </div>
                    <h2 style={{ fontSize: "21px", fontWeight: 800, color: "#0f172a" }}>
                        State Payment Portal
                    </h2>
                    <p style={{ fontSize: "12.5px", color: "#64748b", marginTop: "4px" }}>
                        Government Procurement & MSP Disbursal System
                    </p>
                </div>

                <div style={{ marginBottom: "18px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                        Payment Officer Login
                    </span>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>
                        Authenticate using your registered official mobile number
                    </p>
                </div>

                {error && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        color: "#b91c1c",
                        fontSize: "13px",
                        marginBottom: "18px"
                    }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{error}</span>
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleRequestOtp}>
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                                Registered Mobile Number
                            </label>
                            <div style={{ position: "relative" }}>
                                <div style={{
                                    position: "absolute",
                                    left: "12px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    color: "#64748b",
                                    fontSize: "13.5px",
                                    fontWeight: 600
                                }}>
                                    <Phone size={15} />
                                    <span>+91</span>
                                </div>
                                <input
                                    type="tel"
                                    maxLength={10}
                                    value={phone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        setPhone(val);
                                        if (error) setError("");
                                    }}
                                    placeholder="Enter 10-digit mobile number"
                                    autoFocus
                                    disabled={loading}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px 10px 68px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "14px",
                                        fontFamily: "inherit",
                                        letterSpacing: "0.5px"
                                    }}
                                />
                            </div>
                            <p style={{ fontSize: "11.5px", color: "#64748b", marginTop: "5px" }}>
                                A 6-digit one-time password will be generated for your session.
                            </p>
                        </div>

                        {cooldownSeconds > 0 && (
                            <div style={{
                                background: "#fffbeb",
                                border: "1px solid #fde68a",
                                color: "#b45309",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                marginBottom: "16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}>
                                <RefreshCw size={14} />
                                <span>{isLocked ? "Account locked. Cooldown remaining:" : "Resend cooldown:"} <strong>{formatTimer(cooldownSeconds)}</strong></span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || phone.length !== 10 || cooldownSeconds > 0}
                            style={{
                                width: "100%",
                                padding: "11px",
                                fontSize: "14px",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                    <span>Sending OTP...</span>
                                </>
                            ) : (
                                <>
                                    <span>Get One-Time Password</span>
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
                            padding: "10px 14px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            marginBottom: "16px"
                        }}>
                            <div>
                                <div style={{ fontSize: "11.5px", color: "#64748b" }}>OTP sent to:</div>
                                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>+91 {phone}</div>
                            </div>
                            <button
                                type="submit"
                                onClick={() => {
                                    setStep(1);
                                    setError("");
                                    setOtp("");
                                }}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#2563eb",
                                    fontSize: "12px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontWeight: 600
                                }}
                            >
                                <ArrowLeft size={13} />
                                <span>Change</span>
                            </button>
                        </div>

                        <div style={{ marginBottom: "18px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                                Enter 6-Digit OTP
                            </label>
                            <div style={{ position: "relative" }}>
                                <KeyRound size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        setOtp(val);
                                        if (error) setError("");
                                    }}
                                    placeholder="Enter 6-digit OTP"
                                    autoFocus
                                    disabled={loading}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px 10px 38px",
                                        borderRadius: "8px",
                                        border: "1px solid #cbd5e1",
                                        fontSize: "18px",
                                        fontWeight: 700,
                                        letterSpacing: "6px",
                                        textAlign: "center",
                                        fontFamily: "monospace"
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "12px" }}>
                                <span style={{ color: timer > 60 ? "#64748b" : "#dc2626" }}>
                                    Expires in: <strong>{formatTimer(timer)}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={!canResend || loading || cooldownSeconds > 0}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: (canResend && cooldownSeconds === 0) ? "#2563eb" : "#94a3b8",
                                        cursor: (canResend && cooldownSeconds === 0) ? "pointer" : "not-allowed",
                                        fontWeight: 600,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px"
                                    }}
                                >
                                    <RefreshCw size={12} className={loading ? "spin" : ""} />
                                    <span>Resend OTP</span>
                                </button>
                            </div>
                        </div>

                        {remainingAttempts !== null && (
                            <div style={{
                                fontSize: "12px",
                                fontWeight: 600,
                                color: remainingAttempts <= 1 ? "#dc2626" : "#4b5563",
                                marginBottom: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                background: "#f8fafc",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0"
                            }}>
                                <span>Remaining Verification Attempts:</span>
                                <span style={{
                                    background: remainingAttempts <= 1 ? "#fee2e2" : "#e0f2fe",
                                    color: remainingAttempts <= 1 ? "#b91c1c" : "#0369a1",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: 700
                                }}>
                                    {remainingAttempts} {maxAttempts ? `/ ${maxAttempts}` : ""}
                                </span>
                            </div>
                        )}

                        {cooldownSeconds > 0 && (
                            <div style={{
                                background: "#fee2e2",
                                border: "1px solid #fecaca",
                                color: "#b91c1c",
                                padding: "10px 14px",
                                borderRadius: "8px",
                                fontSize: "13px",
                                marginBottom: "16px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }}>
                                <AlertCircle size={15} />
                                <span>Account locked. Cooldown remaining: <strong>{formatTimer(cooldownSeconds)}</strong></span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || otp.length !== 6 || cooldownSeconds > 0}
                            style={{
                                width: "100%",
                                padding: "11px",
                                fontSize: "14px",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px"
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                    <span>Verifying OTP...</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={16} />
                                    <span>Verify & Sign In</span>
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div style={{
                    marginTop: "24px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "11px",
                    color: "#94a3b8"
                }}>
                    <ShieldCheck size={14} color="#16a34a" />
                    <span>Protected by HttpOnly JWT Session & State Isolation</span>
                </div>
            </div>
        </div>
    );
}
