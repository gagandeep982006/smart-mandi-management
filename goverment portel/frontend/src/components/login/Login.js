import { useState, useContext, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import './Login.css';
import AuthContext from '../../context/auth/AuthContext';

export default function MandiLogin() {
  const navigate = useNavigate();
  const { requestOtpAPI, verifyOtpAPI } = useContext(AuthContext);

  // Step 1: Phone input; Step 2: OTP verification
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: ''
  });

  // Countdown timer for Step 2
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
    const cleanPhone = phone.trim().replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length !== 10) {
      setStatus({ loading: false, error: 'Please enter a valid 10-digit registered mobile number.', success: '' });
      return;
    }

    setStatus({ loading: true, error: '', success: '' });
    try {
      const res = await requestOtpAPI(cleanPhone);
      console.log(res)
      if (res && res.success) {
        setStep(2);
        setTimer(300);
        setCanResend(false);
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

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
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

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend && timer > 270) return;
    setStatus({ loading: true, error: '', success: '' });
    try {
      const res = await requestOtpAPI(phone.trim().replace(/\D/g, ""));
      if (res && res.success) {
        setTimer(300);
        setCanResend(false);
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
      {/* Top National Identity Strip */}
      <div className="gov-tricolor-strip">
        <span className="strip-saffron"></span>
        <span className="strip-white"></span>
        <span className="strip-green"></span>
      </div>

      <div className="gov-card">
        {/* Portal Header */}
        <header className="gov-header">
          <div className="gov-emblem-badge">🌾</div>
          <h1 className="gov-portal-title">Government Portal</h1>
          <p className="gov-portal-subtitle">
            Department of Agriculture & Farmers Welfare <br />
            Government of India
          </p>
        </header>

        {/* Form Section */}
        <main className="gov-form-wrapper">
          <div style={{ marginBottom: '16px' }}>
            <h2 className="gov-form-heading" style={{ margin: 0 }}>
              Official OTP Login
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Sign in with your registered official mobile number
            </p>
          </div>

          {/* Feedback Alerts */}
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

          {/* OTP Mode Form */}
          {step === 1 ? (
            /* Step 1: Phone number */
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

              <button
                type="submit"
                className="gov-btn-submit"
                disabled={status.loading || phone.length !== 10}
              >
                {status.loading ? 'Requesting OTP...' : 'Send OTP via SMS'}
              </button>
            </form>
          ) : (
            /* Step 2: OTP verification */
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

              {/* Timer & Resend */}
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

              <button
                type="submit"
                className="gov-btn-submit"
                disabled={status.loading || otp.length !== 6}
              >
                {status.loading ? 'Verifying OTP...' : 'Verify & Enter Portal'}
              </button>
            </form>
          )}
        </main>

        {/* Security & Disclaimer Footer */}
        <footer className="gov-footer">
          <p className="gov-security-text">
            🔒 Authorized Government Personnel Only. 6-digit OTP verification enforced.
          </p>
        </footer>
      </div>
    </div>
  );
}