import { useState, useContext, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import './Login.css';
import AuthContext from '../../context/auth/AuthContext';

export default function MandiLogin() {
  const navigate = useNavigate();
  const { requestOtpAPI, verifyOtpAPI } = useContext(AuthContext);

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(300); 
  const [canResend, setCanResend] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [maxAttempts, setMaxAttempts] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: ''
  });

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
    const cleanPhone = phone.trim().replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length !== 10) {
      setStatus({ loading: false, error: 'Please enter a valid 10-digit registered mobile number.', success: '' });
      return;
    }

    setStatus({ loading: true, error: '', success: '' });
    try {
      const res = await requestOtpAPI(cleanPhone);
      if (res && res.success) {
        setStep(2);
        setTimer(300);
        setCanResend(false);
        if (res.remaining_attempts !== undefined) setRemainingAttempts(res.remaining_attempts);
        if (res.max_attempts !== undefined) setMaxAttempts(res.max_attempts);
        const mockOtp = res.otp || res.mock_otp || res.data?.otp;
        if (mockOtp) {
          setOtp(String(mockOtp));
        }
        setStatus({
          loading: false,
          error: '',
          success: res.message || 'OTP dispatched to registered mobile number.'
        });
      } else {
        if (res?.retry_after || res?.cooldown_seconds) {
          setCooldownSeconds(res.cooldown_seconds || res.retry_after);
          setIsLocked(Boolean(res.is_locked));
        }
        setStatus({
          loading: false,
          error: res?.message || 'Failed to dispatch OTP. Please verify your registered number.',
          success: ''
        });
      }
    } catch (err) {
      setStatus({ loading: false, error: 'Network error requesting OTP. Please try again.', success: '' });
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (isLocked || cooldownSeconds > 0) return;
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setStatus({ loading: false, error: 'Please enter the 6-digit numeric OTP.', success: '' });
      return;
    }

    setStatus({ loading: true, error: '', success: '' });
    try {
      const res = await verifyOtpAPI(phone.trim().replace(/\D/g, ""), cleanOtp);
      if (res && res.success) {
        setStatus({ loading: true, error: '', success: 'Authentication successful! Redirecting...' });
        setTimeout(() => {
          navigate("/");
        }, 300);
      } else {
        if (res?.remaining_attempts !== undefined) setRemainingAttempts(res.remaining_attempts);
        if (res?.max_attempts !== undefined) setMaxAttempts(res.max_attempts);
        if (res?.retry_after || res?.cooldown_seconds) {
          setCooldownSeconds(res.cooldown_seconds || res.retry_after);
          setIsLocked(Boolean(res.is_locked));
        }
        setStatus({
          loading: false,
          error: res?.message || 'Invalid or expired OTP. Please try again.',
          success: ''
        });
      }
    } catch (err) {
      setStatus({ loading: false, error: 'Verification failed. Please check your network connection.', success: '' });
    }
  };

  const handleResendOtp = async () => {
    if (!canResend && timer > 270) return;
    if (cooldownSeconds > 0) return;
    setStatus({ loading: true, error: '', success: '' });
    try {
      const res = await requestOtpAPI(phone.trim().replace(/\D/g, ""));
      if (res && res.success) {
        setTimer(300);
        setCanResend(false);
        if (res.remaining_attempts !== undefined) setRemainingAttempts(res.remaining_attempts);
        if (res.max_attempts !== undefined) setMaxAttempts(res.max_attempts);
        const mockOtp = res.otp || res.mock_otp || res.data?.otp;
        if (mockOtp) {
          setOtp(String(mockOtp));
        } else {
          setOtp('');
        }
        setStatus({
          loading: false,
          error: '',
          success: 'A new 6-digit OTP has been dispatched to your mobile.'
        });
      } else {
        if (res?.retry_after || res?.cooldown_seconds) {
          setCooldownSeconds(res.cooldown_seconds || res.retry_after);
          setIsLocked(Boolean(res.is_locked));
        }
        setStatus({
          loading: false,
          error: res?.message || 'Could not resend OTP.',
          success: ''
        });
      }
    } catch (err) {
      setStatus({ loading: false, error: 'Failed to resend OTP.', success: '' });
    }
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="gov-login-container">
      <div className="gov-tricolor-strip">
        <span className="strip-saffron"></span>
        <span className="strip-white"></span>
        <span className="strip-green"></span>
      </div>

      <div className="gov-card">
        <header className="gov-header">
          <div className="gov-emblem-badge">🌾</div>
          <h1 className="gov-portal-title">Government Portal</h1>
          <p className="gov-portal-subtitle">
            Department of Agriculture & Farmers Welfare <br />
            Government of India
          </p>
        </header>

        <main className="gov-form-wrapper">
          <div style={{ marginBottom: '16px' }}>
            <h2 className="gov-form-heading" style={{ margin: 0 }}>
              Official OTP Login
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Sign in with your registered official mobile number
            </p>
          </div>

          {status.error && (
            <div className="gov-alert gov-alert-danger" role="alert" style={{ marginBottom: '16px' }}>
              <span className="alert-icon">⚠️</span>
              <span>{status.error}</span>
            </div>
          )}

          {status.success && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>✓</span>
              <span>{status.success}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} noValidate>
              <div className="gov-form-group">
                <label htmlFor="phone">
                  Registered Mobile Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div className={`gov-phone-input-group ${phone.length === 10 ? 'valid' : phone.length > 0 ? 'typing' : ''}`}>
                  <div className="gov-country-badge" title="Republic of India (+91)">
                    <span className="gov-flag-icon" role="img" aria-label="India Flag">🇮🇳</span>
                    <span className="gov-dial-code">+91</span>
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      if (status.error) setStatus(s => ({ ...s, error: '' }));
                    }}
                    placeholder="Enter 10-digit registered number"
                    autoComplete="tel-national"
                    pattern="[0-9]{10}"
                    inputMode="numeric"
                    disabled={status.loading}
                    required
                    autoFocus
                  />
                </div>
                <div className="gov-input-feedback">
                  <span className={`gov-feedback-text ${phone.length === 10 ? 'ready' : phone.length > 0 ? 'typing' : ''}`}>
                    {phone.length === 10
                      ? '✓ Valid registered mobile number'
                      : phone.length > 0
                      ? `Enter 10 digits (${10 - phone.length} more needed)`
                      : 'Login identifier is your official registered mobile number'}
                  </span>
                  <span className={`gov-char-count ${phone.length === 10 ? 'complete' : ''}`}>
                    {phone.length}/10
                  </span>
                </div>
              </div>

              {cooldownSeconds > 0 && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#b45309',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>⏳</span>
                  <span>{isLocked ? 'Account locked. Cooldown remaining:' : 'Resend cooldown:'} <strong>{formatTimer(cooldownSeconds)}</strong></span>
                </div>
              )}

              <button
                type="submit"
                className="gov-btn-submit"
                disabled={status.loading || phone.length !== 10 || cooldownSeconds > 0}
              >
                {status.loading ? 'Requesting OTP...' : 'Send OTP via SMS'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} noValidate>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.85rem' }}>
                <span style={{ color: '#4a5568' }}>
                  OTP sent to: <strong>+91 {phone}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setStatus({ loading: false, error: '', success: '' });
                  }}
                  style={{ background: 'none', border: 'none', color: '#1b4332', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                >
                  Change Number
                </button>
              </div>

              <div className="gov-form-group">
                <label htmlFor="otp">Enter 6-Digit OTP</label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (status.error) setStatus(s => ({ ...s, error: '' }));
                  }}
                  placeholder="• • • • • •"
                  autoComplete="one-time-code"
                  disabled={status.loading}
                  style={{
                    textAlign: 'center',
                    fontSize: '1.4rem',
                    letterSpacing: '8px',
                    fontWeight: 700
                  }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0', fontSize: '0.8rem' }}>
                <span style={{ color: timer > 0 ? '#4a5568' : '#e53e3e' }}>
                  {timer > 0 ? `Expires in ${formatTimer(timer)}` : 'OTP Expired'}
                </span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={status.loading || timer > 270}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: timer <= 270 ? '#1b4332' : '#a0aec0',
                    cursor: timer <= 270 ? 'pointer' : 'not-allowed',
                    fontWeight: 600
                  }}
                >
                  Resend OTP
                </button>
              </div>

                {remainingAttempts !== null && (
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: remainingAttempts <= 1 ? '#dc2626' : '#4b5563',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
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
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>⚠️</span>
                    <span>Account locked. Cooldown remaining: <strong>{formatTimer(cooldownSeconds)}</strong></span>
                  </div>
                )}

                <button
                  type="submit"
                  className="gov-btn-submit"
                  disabled={status.loading || otp.length !== 6 || cooldownSeconds > 0}
                >
                  {status.loading ? 'Verifying OTP...' : 'Verify & Enter Portal'}
                </button>
            </form>
          )}
        </main>

        <footer className="gov-footer">
          <p className="gov-security-text">
            🔒 Authorized Government Personnel Only. 6-digit OTP verification enforced.
          </p>
        </footer>
      </div>
    </div>
  );
}