import React, { useState, useEffect } from 'react';
import { authApi } from '../api';
import { 
  Sprout, 
  ShieldCheck, 
  Smartphone, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeft,
  Lock
} from 'lucide-react';
import CircularLoader from './CircularLoader';

export default function LoginScreen({ onLoginSuccess }) {
  const [step, setStep] = useState(1); 
  const [aadhaar, setAadhaar] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timer, setTimer] = useState(300); 
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [maxAttempts, setMaxAttempts] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
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
    setError('');
    setSuccessMsg('');

    const cleanAadhaar = aadhaar.trim();
    const cleanMobile = mobile.trim();

    if (!/^\d{12}$/.test(cleanAadhaar)) {
      setError('Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError('Please enter a valid 10-digit mobile number starting with 6-9.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.requestOtp(cleanAadhaar, cleanMobile);
      if (res.success) {
        setStep(2);
        setTimer(300);
        setSuccessMsg(res.message || 'OTP has been dispatched to your mobile number.');
        if (res.remaining_attempts !== undefined) setRemainingAttempts(res.remaining_attempts);
        if (res.max_attempts !== undefined) setMaxAttempts(res.max_attempts);
        const mockOtp = res.otp || res.mock_otp || res.data?.otp;
        if (mockOtp) {
          setOtp(String(mockOtp));
        }
      } else {
        setError(res.message || 'Failed to request OTP');
        if (res.retry_after || res.cooldown_seconds) {
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
      setError(err.message || 'Invalid Aadhaar or mobile number');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (isLocked || cooldownSeconds > 0) return;
    setError('');

    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError('Please enter a 6-digit numeric OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyOtp(aadhaar.trim(), mobile.trim(), cleanOtp);
      if (res.success) {
        onLoginSuccess(res.farmer);
      } else {
        setError(res.message || 'Invalid or expired OTP');
        if (res.remaining_attempts !== undefined) setRemainingAttempts(res.remaining_attempts);
        if (res.max_attempts !== undefined) setMaxAttempts(res.max_attempts);
        if (res.retry_after || res.cooldown_seconds) {
          setCooldownSeconds(res.cooldown_seconds || res.retry_after);
          setIsLocked(Boolean(res.is_locked));
        }
      }
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
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)',
    }}>
      <div className="header-top">
        <span>
          <ShieldCheck size={14} /> Government of Haryana • Food, Civil Supplies & Consumer Affairs Department
        </span>
        <span>Secure Farmer Verification System</span>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow: 'var(--card-shadow-xl)',
          border: '1px solid var(--gray-200)',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'var(--primary-gradient)',
            color: '#ffffff',
            padding: '2rem 2rem 1.5rem',
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              backdropFilter: 'blur(4px)'
            }}>
              <Sprout size={32} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.25rem' }}>
              e-Kisan Mandi Portal
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#c8e6c9', margin: 0 }}>
              किसान ई-उपार्जन एवं स्लॉट बुकिंग प्रणाली
            </p>
          </div>

          <div style={{ padding: '2rem' }}>
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#dc2626',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}>
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleRequestOtp}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Aadhaar Number (आधार संख्या)</label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>12 Digits</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter 12-digit Aadhaar number"
                      maxLength={12}
                      value={aadhaar}
                      onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Registered Mobile Number (मोबाइल नंबर)</label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>10 Digits</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      disabled={loading}
                      required
                    />
                  </div>
                  <span className="form-hint">
                    Aadhaar and mobile must belong to the registered farmer record.
                  </span>
                </div>

                {cooldownSeconds > 0 && (
                  <div style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <RefreshCw size={14} />
                    <span>{isLocked ? 'Account locked. Cooldown remaining:' : 'Resend cooldown:'} <strong>{formatTimer(cooldownSeconds)}</strong></span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: '1rem' }}
                  disabled={loading || aadhaar.length !== 12 || mobile.length !== 10 || cooldownSeconds > 0}
                >
                  {loading ? (
                    <>
                      <CircularLoader size={18} strokeWidth={2.5} color="#ffffff" style={{ marginRight: '8px' }} /> Verifying Record...
                    </>
                  ) : (
                    <>
                      Request OTP <ArrowRight size={18} />
                    </>
                  )}
                </button>

              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{
                  background: 'var(--gray-50)',
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--gray-200)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Sent OTP to:</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                      +91 {mobile}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-600)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Change
                  </button>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">Enter 6-Digit Verification OTP</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    autoFocus
                    required
                    style={{
                      letterSpacing: '0.4em',
                      textAlign: 'center',
                      fontSize: '1.35rem',
                      fontWeight: 700
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--gray-500)'
                  }}>
                    <span>Expires in: <strong>{formatTimer(timer)}</strong></span>
                    {timer === 0 && (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-600)',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>

                {remainingAttempts !== null && (
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: remainingAttempts <= 1 ? '#dc2626' : '#4b5563',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.6rem',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <span>Remaining Verification Attempts:</span>
                    <span style={{
                      background: remainingAttempts <= 1 ? '#fee2e2' : '#e0f2fe',
                      color: remainingAttempts <= 1 ? '#b91c1c' : '#0369a1',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {remainingAttempts} {maxAttempts ? `/ ${maxAttempts}` : ''}
                    </span>
                  </div>
                )}

                {cooldownSeconds > 0 && (
                  <div style={{
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <AlertCircle size={15} />
                    <span>Account locked. Cooldown remaining: <strong>{formatTimer(cooldownSeconds)}</strong></span>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                  disabled={loading || otp.length !== 6 || cooldownSeconds > 0}
                >
                  {loading ? (
                    <>
                      <CircularLoader size={18} strokeWidth={2.5} color="#ffffff" style={{ marginRight: '8px' }} /> Verifying...
                    </>
                  ) : (
                    <>
                      <Lock size={18} /> Verify OTP & Enter Portal
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => { setStep(1); setOtp(''); setError(''); }}
                  disabled={loading}
                >
                  <ArrowLeft size={16} /> Back to Mobile / Aadhaar
                </button>
              </form>
            )}
          </div>

          <div style={{
            background: 'var(--gray-50)',
            borderTop: '1px solid var(--gray-200)',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--gray-500)'
          }}>
            Strictly for authorized farmers. Aadhaar details are verified using secure cryptographic hashing.
          </div>
        </div>
      </div>
    </div>
  );
}
