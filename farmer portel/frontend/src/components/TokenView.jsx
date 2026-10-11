import React, { useState, useEffect } from 'react';
import { farmerApi } from '../api';
import { useLanguage } from '../context/LanguageContext';
import { formatIndianTime, formatIndianDate } from '../utils/dateUtils';
import { 
  Ticket, 
  Printer, 
  MapPin, 
  Clock, 
  Calendar, 
  Sprout, 
  User, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle,
  Users,
  Timer,
  Megaphone,
  Bell
} from 'lucide-react';
import CircularLoader from './CircularLoader';

export default function TokenView({ onNavigate }) {
  const { lang, t } = useLanguage();
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const fetchToken = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await farmerApi.getToken();
      if (res.success && res.data) {
        setTokenData(res.data);
      } else {
        setTokenData(null);
      }
    } catch (err) {
      setError(err.message || 'Error loading queue token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  const handleRespondEarly = async (requestId, action) => {
    setActionLoading(true);
    setNotice(null);
    try {
      const res = await farmerApi.respondEarlyCallRequest(requestId, action);
      if (res.success) {
        setNotice({
          type: action === 'ACCEPTED' ? 'success' : 'info',
          message: action === 'ACCEPTED' ? t('earlyCallAcceptedSuccess') : t('earlyCallDeclinedSuccess')
        });
        await fetchToken();
      }
    } catch (err) {
      setError(err.message || 'Failed to update early call response');
    } finally {
      setActionLoading(false);
    }
  };

  // Compute status progression index (0 to 4)
  const getStepIndex = (status) => {
    switch (status) {
      case 'BOOKED': return 0;
      case 'WAITING': return 1;
      case 'CALLED': return 2;
      case 'ARRIVED':
      case 'PROCESSING': return 3;
      case 'COMPLETED': return 4;
      default: return 0;
    }
  };

  const steps = [
    { label: lang === 'hi' ? 'स्लॉट पुष्टि' : 'Slot Confirmed', desc: lang === 'hi' ? 'सर्वर पर जारी किया गया' : 'Issued on Mandi Server' },
    { label: lang === 'hi' ? 'कतार में प्रतीक्षा' : 'Queue Waiting', desc: lang === 'hi' ? 'मंडी गेट पर रिपोर्ट करें' : 'Present at Mandi Gate' },
    { label: lang === 'hi' ? 'काउंटर पर बुलावा' : 'Called to Counter', desc: lang === 'hi' ? 'उपार्जन काउंटर पर जाएं' : 'Proceed to Intake Bay' },
    { label: lang === 'hi' ? 'गुणवत्ता एवं तौल' : 'Quality & Weighment', desc: lang === 'hi' ? 'नमी जांच व तौल जारी' : 'Moisture check & weighing' },
    { label: lang === 'hi' ? 'उपार्जन पूर्ण' : 'Procurement Complete', desc: lang === 'hi' ? 'भुगतान वाउचर जारी' : 'Payment voucher issued' }
  ];

  const currentStep = tokenData ? getStepIndex(tokenData.status) : 0;
  const farmersAheadCount = tokenData?.farmers_ahead !== undefined ? Number(tokenData.farmers_ahead) : 0;

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ticket size={24} color="var(--primary-600)" />
            {t('gatePassTitle')}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            {t('gatePassSubtitle')}
          </p>
        </div>

        {tokenData && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={fetchToken} disabled={loading || actionLoading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {t('refreshQueue')}
            </button>
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={15} /> {t('printPass')}
            </button>
          </div>
        )}
      </div>

      {/* Notice Message */}
      {notice && (
        <div className={`alert-banner ${notice.type === 'success' ? 'success' : 'info'}`} style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={20} />
          <span>{notice.message}</span>
        </div>
      )}

      {error && (
        <div className="alert-banner error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Early Call Request High Priority Banner */}
      {tokenData?.early_call_request && (
        <div style={{
          background: '#fffbeb',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>
                <Bell size={20} />
                <span>{t('earlyCallAlertTitle')}</span>
              </div>
              <p style={{ color: '#92400e', fontSize: '0.9rem', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                {tokenData.early_call_request.operator_message || t('earlyCallAlertDesc')}
              </p>
              <div style={{ fontSize: '0.825rem', color: '#b45309', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px' }}>
                <span>🏢 {tokenData.early_call_request.counter_name || tokenData.counter_name}</span>
                <span>⏰ {t('scheduledSlot')}: <strong>{tokenData.early_call_request.scheduled_time_formatted || formatIndianTime(tokenData.early_call_request.scheduled_time || tokenData.booking_time)}</strong></span>
                {(tokenData.early_call_request.requested_at || tokenData.early_call_request.requested_at_formatted) && (
                  <span>📨 {t('earlyRequestedAt')}: <strong>{tokenData.early_call_request.requested_at_formatted || formatIndianTime(tokenData.early_call_request.requested_at)}</strong></span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-success"
                style={{ padding: '9px 18px', fontSize: '0.9rem', fontWeight: 700 }}
                disabled={actionLoading}
                onClick={() => handleRespondEarly(tokenData.early_call_request.request_id, 'ACCEPTED')}
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                <span>{t('acceptEarlyArrival')}</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: '#f59e0b', color: '#b45309', padding: '9px 16px', fontSize: '0.9rem' }}
                disabled={actionLoading}
                onClick={() => handleRespondEarly(tokenData.early_call_request.request_id, 'DECLINED')}
              >
                <span>{t('declineEarlyArrival')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <CircularLoader 
          size={40} 
          text={lang === 'hi' ? 'सक्रिय टोकन एवं लाइव कतार स्थिति प्राप्त की जा रही है...' : 'Fetching current active token and live queue status...'} 
          center 
        />
      ) : tokenData ? (
        <>
          {/* Live Queue Pulse Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {/* Farmers Ahead */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-600)', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
                <Users size={16} color="var(--primary-600)" />
                {t('farmersAhead')}
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-700)', marginTop: '0.25rem' }}>
                {farmersAheadCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                {t('vehiclesAheadDesc')}
              </div>
            </div>

            {/* Currently Called at Counter */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--blue-600)', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
                <Megaphone size={16} color="var(--blue-600)" />
                {t('currentlyCalled')}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gray-900)', marginTop: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tokenData.currently_called ? (
                  <span>
                    <span style={{ color: 'var(--blue-600)', marginRight: '6px' }}>{tokenData.currently_called.token_number}</span>
                    {tokenData.currently_called.farmer_name}
                  </span>
                ) : (
                  <span style={{ color: 'var(--gray-400)', fontWeight: 500 }}>{t('noFarmerCalled')}</span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: tokenData.currently_called ? '#1d4ed8' : 'var(--gray-500)', marginTop: '4px', fontWeight: tokenData.currently_called ? 600 : 400 }}>
                {tokenData.currently_called ? (
                  <span>📍 {tokenData.currently_called.procurement_stage || tokenData.currently_called.status}</span>
                ) : (
                  tokenData.counter_name || t('designatedCounter')
                )}
              </div>
            </div>

            {/* Approximate Wait Time */}
            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--amber-500)', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-500)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
                <Timer size={16} color="var(--amber-600)" />
                {t('approxWaitTime')}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--amber-600)', marginTop: '0.25rem' }}>
                {tokenData.status === 'CALLED'
                  ? t('proceedToCounter')
                  : tokenData.status === 'PROCESSING'
                    ? t('processingNow')
                    : tokenData.status === 'COMPLETED'
                      ? t('completed')
                      : farmersAheadCount === 0
                        ? t('yourTurn')
                        : `~${tokenData.approximate_waiting_time_minutes || (farmersAheadCount * (tokenData.average_service_time_minutes || 10))} ${t('minsWait')}`}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                {tokenData.status === 'CALLED' || tokenData.status === 'PROCESSING'
                  ? (lang === 'hi' ? 'काउंटर पर आपकी सक्रिय बारी है' : 'Active turn at intake counter')
                  : farmersAheadCount > 0
                    ? `${farmersAheadCount} ${lang === 'hi' ? 'किसान आगे' : 'farmer(s) ahead'} × ${tokenData.average_service_time_minutes || 10}m ${lang === 'hi' ? 'औसत' : 'avg'}`
                    : (lang === 'hi' ? 'आप कतार में सबसे आगे हैं (0 मिनट प्रतीक्षा)' : 'You are at the front of the queue (0 min wait)')}
              </div>
            </div>
          </div>

          {/* Main Pass Card */}
          <div className="card" style={{
            padding: '0',
            overflow: 'hidden',
            border: '2px solid var(--primary-500)',
            marginBottom: '2rem',
            boxShadow: 'var(--card-shadow-lg)'
          }}>
            {/* Header of Pass */}
            <div style={{
              background: 'var(--primary-gradient)',
              color: '#ffffff',
              padding: '1.5rem 2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                  {t('govDepartment')}
                </span>
                <h3 style={{ fontSize: '1.35rem', color: '#ffffff', margin: '0.2rem 0 0' }}>
                  {lang === 'hi' ? 'ई-मंडी गेट पास एवं कतार टोकन' : 'Electronic Mandi Gate Pass'}
                </h3>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '6px 14px',
                borderRadius: '8px',
                backdropFilter: 'blur(4px)',
                textAlign: 'right'
              }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{t('status')}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{tokenData.status}</div>
              </div>
            </div>

            {/* Token Big Number Section */}
            <div style={{
              padding: '2rem',
              background: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px dashed var(--gray-300)',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)', textTransform: 'uppercase', fontWeight: 600 }}>
                  {t('queueTokenNo')}
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary-600)', letterSpacing: '0.05em', lineHeight: 1.1 }}>
                  {tokenData.token_number || `T_${tokenData.booking_id}`}
                </div>
                {/* Prominently Display Farmer Name */}
                <div style={{ fontSize: '1.05rem', color: 'var(--gray-900)', fontWeight: 700, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} color="var(--primary-600)" />
                  <span>{tokenData.farmer_name || 'Registered Farmer'}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '2px' }}>
                  {t('bookingRef')}: <strong>#BK-{tokenData.booking_id}</strong>
                </div>
              </div>

              {/* Mandi & Counter Stamp */}
              <div style={{
                background: 'var(--gray-50)',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--gray-200)',
                minWidth: '220px'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>{t('designatedCounter')}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                  {tokenData.counter_name}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '2px' }}>
                  {tokenData.mandi_name}
                </div>
              </div>
            </div>

            {/* Pass Metadata Grid */}
            <div style={{
              padding: '1.75rem 2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1.25rem',
              background: 'var(--gray-50)',
              fontSize: '0.9rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>{t('farmerName')}</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--gray-900)' }}>{tokenData.farmer_name || 'Registered Farmer'}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>{t('serviceDate')}</span>
                <strong>{formatIndianDate(tokenData.service_date || tokenData.booking_time)}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>{t('scheduledSlot')}</span>
                <strong>{formatIndianTime(tokenData.booking_time)}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>{t('crop')}</span>
                <strong>{tokenData.crop_name}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>{t('approvedQty')}</span>
                <strong style={{ color: 'var(--primary-700)' }}>{tokenData.quantity_approved || tokenData.quantity_req} {t('quintals')}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'block' }}>{t('avgServiceTime')}</span>
                <strong>{tokenData.average_service_time_minutes || 10} {t('minsWait')} / {lang === 'hi' ? 'किसान' : 'Farmer'}</strong>
              </div>
            </div>
          </div>

          {/* Real-time Queue Lifecycle Stepper */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div className="card-header">
              <div className="card-title">
                <Clock size={20} color="var(--primary-600)" />
                <span>{t('liveProgression')}</span>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                onClick={fetchToken}
              >
                <RefreshCw size={14} /> {t('refreshQueue')}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {steps.map((st, idx) => {
                const isPassed = idx < currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    background: isCurrent ? 'var(--primary-50)' : isPassed ? '#f0fdf4' : 'var(--gray-50)',
                    border: isCurrent ? '1px solid var(--primary-500)' : '1px solid var(--gray-200)',
                    opacity: idx > currentStep ? 0.6 : 1
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isPassed || isCurrent ? 'var(--primary-600)' : 'var(--gray-300)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}>
                      {isPassed ? <CheckCircle2 size={18} /> : idx + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: isCurrent ? 'var(--primary-700)' : 'var(--gray-900)' }}>
                        {st.label}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                        {st.desc}
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="badge badge-primary">
                        {t('currentStage')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <Ticket size={48} color="var(--gray-300)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--gray-800)', marginBottom: '0.5rem' }}>
            {t('noTokenFound')}
          </h3>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            {t('noTokenDesc')}
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('book-slot')}>
            {t('bookSlotBtn')}
          </button>
        </div>
      )}
    </div>
  );
}
