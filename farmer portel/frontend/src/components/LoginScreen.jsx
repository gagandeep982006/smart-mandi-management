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

export default function LoginScreen({ onLoginSuccess }) {
  const [step, setStep] = useState(1); // 1: Aadhaar + Mobile, 2: OTP
  const [aadhaar, setAadhaar] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timer, setTimer] = useState(300); // 5 mins in seconds

  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Client-side validations
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
        const mockOtp = res.otp || res.mock_otp || res.data?.otp;
        if (mockOtp) {
          setOtp(String(mockOtp));
        }
      } else {
        setError(res.message || 'Failed to request OTP');
      }
    } catch (err) {
      setError(err.message || 'Invalid Aadhaar or mobile number');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
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
      }
    } catch (err) {
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
      {/* Top Gov Bar */}
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
          {/* Card Header */}
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

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: '1rem' }}
                  disabled={loading || aadhaar.length !== 12 || mobile.length !== 10}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> Verifying Record...
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

                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  marginBottom: '1.25rem'
                }}>
                  <strong>Dev Mode Note:</strong> OTP is logged to the backend console terminal (look for <code>[DEV ONLY] OTP for mobile ...: XXXXXX</code>).
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> Verifying...
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

          {/* Footer note */}
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
