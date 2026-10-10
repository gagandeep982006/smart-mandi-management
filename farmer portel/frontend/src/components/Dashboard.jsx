import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { farmerApi } from '../api';
import { formatIndianTime, formatIndianDate } from '../utils/dateUtils';
import { 
  Sprout, 
  CalendarPlus, 
  Ticket, 
  CreditCard, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Scale,
  Landmark,
  ShieldAlert,
  Bell,
  RefreshCw
} from 'lucide-react';

export default function Dashboard({ 
  dashboardData, 
  onNavigate, 
  onReschedule, 
  onCancel 
}) {
  const { lang, t } = useLanguage();
  const [earlyRequest, setEarlyRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [earlyNotice, setEarlyNotice] = useState(null);

  const { 
    farmer, 
    land_summary, 
    active_booking, 
    recent_bookings = [], 
    quota_summary = [] 
  } = dashboardData || {};

  // Check for any pending early call request from Mandi counter
  useEffect(() => {
    const checkEarlyRequest = async () => {
      try {
        const res = await farmerApi.getToken();
        if (res.success && res.data?.early_call_request) {
          setEarlyRequest(res.data.early_call_request);
          return;
        }
      } catch (err) {
        // Silently skip if no active token
      }
      try {
        const reqRes = await farmerApi.getEarlyCallRequests();
        if (reqRes.success) {
          const req = Array.isArray(reqRes.data) ? reqRes.data[0] : (reqRes.early_call_request || reqRes.data?.early_call_request);
          if (req) {
            setEarlyRequest(req);
          }
        }
      } catch (err) {
        // Silently skip
      }
    };
    checkEarlyRequest();
  }, []);

  const handleRespondEarly = async (requestId, action) => {
    setActionLoading(true);
    try {
      const res = await farmerApi.respondEarlyCallRequest(requestId, action);
      if (res.success) {
        setEarlyNotice({
          type: action === 'ACCEPTED' ? 'success' : 'info',
          message: action === 'ACCEPTED' ? t('earlyCallAcceptedSuccess') : t('earlyCallDeclinedSuccess')
        });
        setEarlyRequest(null);
      }
    } catch (err) {
      console.error("Early request response error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Farmer verified land in acres (only verified agricultural / irrigated land)
  const verifiedLand = Number(
    dashboardData?.eligible_land_acres ?? 
    land_summary?.total_eligible_land ?? 
    land_summary?.eligible_area ?? 
    (quota_summary.length > 0 ? quota_summary[0].eligible_land : 1) ?? 
    1
  );

  // State-approved quota rate (amount in QTL/acre from procurement_quota, e.g. 50.00 QTL/acre for Haryana)
  const quotaPerAcre = Number(
    dashboardData?.quota_per_acre ?? 
    (quota_summary.length > 0 ? quota_summary[0].quota_per_acre : 50) ?? 
    50
  );

  // Core formula: (farmer having verified land in acre * amount allocated to sold)
  // e.g. 1.00 Acre * 50.00 QTL/Acre = 50.00 Quintals
  const calculatedAllocatedQuota = Number((verifiedLand * quotaPerAcre).toFixed(2));

  // Directly use state-approved total quota or calculated (verified land * quota per acre), NEVER summing across crops
  const totalAllocated = dashboardData?.total_allocated_quota !== undefined 
    ? Number(dashboardData.total_allocated_quota) 
    : calculatedAllocatedQuota;

  const totalSold = dashboardData?.total_sold_quota !== undefined 
    ? Number(dashboardData.total_sold_quota) 
    : (quota_summary.length > 0 ? Number(quota_summary[0].total_sold_quantity || 0) : 0);

  const totalRemaining = dashboardData?.total_remaining_quota !== undefined 
    ? Number(dashboardData.total_remaining_quota) 
    : Math.max(0, Number((totalAllocated - totalSold).toFixed(2)));

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'BOOKED':
      case 'WAITING':
        return 'badge badge-warning';
      case 'CALLED':
      case 'ARRIVED':
      case 'PROCESSING':
        return 'badge badge-info';
      case 'COMPLETED':
        return 'badge badge-success';
      case 'CANCELLED':
      case 'NOT_ARRIVED':
        return 'badge badge-danger';
      default:
        return 'badge badge-secondary';
    }
  };

  return (
    <div>
      {/* Notice Message */}
      {earlyNotice && (
        <div className={`alert-banner ${earlyNotice.type === 'success' ? 'success' : 'info'}`} style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={20} />
          <span>{earlyNotice.message}</span>
        </div>
      )}

      {/* Early Call Request High Priority Banner on Dashboard */}
      {earlyRequest && (
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
                {earlyRequest.operator_message || t('earlyCallAlertDesc')}
              </p>
              <div style={{ fontSize: '0.825rem', color: '#b45309', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px' }}>
                <span>🏢 {earlyRequest.counter_name}</span>
                <span>⏰ {t('scheduledSlot')}: <strong>{earlyRequest.scheduled_time_formatted || formatIndianTime(earlyRequest.scheduled_time)}</strong></span>
                {(earlyRequest.requested_at || earlyRequest.requested_at_formatted) && (
                  <span>📨 {t('earlyRequestedAt')}: <strong>{earlyRequest.requested_at_formatted || formatIndianTime(earlyRequest.requested_at)}</strong></span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-success"
                style={{ padding: '9px 18px', fontSize: '0.9rem', fontWeight: 700 }}
                disabled={actionLoading}
                onClick={() => handleRespondEarly(earlyRequest.request_id, 'ACCEPTED')}
              >
                {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                <span>{t('acceptEarlyArrival')}</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: '#f59e0b', color: '#b45309', padding: '9px 16px', fontSize: '0.9rem' }}
                disabled={actionLoading}
                onClick={() => handleRespondEarly(earlyRequest.request_id, 'DECLINED')}
              >
                <span>{t('declineEarlyArrival')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
        borderRadius: '16px',
        padding: '2rem',
        color: '#ffffff',
        marginBottom: '2rem',
        boxShadow: 'var(--card-shadow-lg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '750px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            marginBottom: '0.75rem',
            backdropFilter: 'blur(4px)'
          }}>
            <Sprout size={14} /> {t('registeredDashboard')}
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '1.9rem', marginBottom: '0.5rem', fontWeight: 700 }}>
            {t('welcome')}, {farmer?.name || 'Farmer'}
          </h1>
          <p style={{ color: '#c8e6c9', fontSize: '0.95rem', margin: 0 }}>
            {t('tehsil')}: <strong>{farmer?.tehsil_name || 'N/A'}</strong> • {t('district')}: <strong>{farmer?.district_name || 'N/A'}</strong> • {t('state')}: <strong>{farmer?.state_name || 'N/A'}</strong>
          </p>
        </div>

        <div style={{
          position: 'absolute',
          right: '2rem',
          bottom: '1rem',
          opacity: 0.15,
          pointerEvents: 'none'
        }}>
          <Sprout size={160} color="#ffffff" />
        </div>
      </div>

      {/* Multiple Sales Educational Alert Banner */}
      <div className="alert-banner info">
        <CheckCircle2 size={24} style={{ color: 'var(--primary-600)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong style={{ display: 'block', marginBottom: '2px', color: 'var(--primary-700)' }}>
            {t('multipleSalesInfoTitle')}
          </strong>
          <span>
            {t('multipleSalesInfoDesc')}
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon green">
            <Scale size={26} />
          </div>
          <div className="kpi-details">
            <span className="kpi-title">{t('verifiedLand')}</span>
            <span className="kpi-value">{Number(land_summary?.total_eligible_land ?? dashboardData?.eligible_land_acres ?? 0).toFixed(2)}</span>
            <span className="kpi-sub">{t('eligibleAcres')}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon blue">
            <TrendingUp size={26} />
          </div>
          <div className="kpi-details">
            <span className="kpi-title">{t('allocatedQuota')}</span>
            <span className="kpi-value">{totalAllocated.toFixed(2)}</span>
            <span className="kpi-sub">
              {verifiedLand > 0 && quotaPerAcre > 0 ? `${verifiedLand.toFixed(2)} Acre × ${quotaPerAcre} QTL/Acre` : `${t('quintals')}`}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">
            <Landmark size={26} />
          </div>
          <div className="kpi-details">
            <span className="kpi-title">{t('cropSold')}</span>
            <span className="kpi-value">{totalSold.toFixed(2)}</span>
            <span className="kpi-sub">{t('soldToDate')}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber">
            <Sprout size={26} />
          </div>
          <div className="kpi-details">
            <span className="kpi-title">{t('remainingQuota')}</span>
            <span className="kpi-value" style={{ color: 'var(--primary-600)' }}>
              {totalRemaining.toFixed(2)}
            </span>
            <span className="kpi-sub">{t('availableToSell')}</span>
          </div>
        </div>
      </div>

      {/* Active Booking Card or Quick Booking Prompt */}
      {active_booking ? (
        <div className="card" style={{ marginBottom: '2rem', borderLeft: '5px solid var(--primary-500)' }}>
          <div className="card-header">
            <div className="card-title">
              <Ticket size={22} color="var(--primary-600)" />
              <span>{t('activeAppointment')}</span>
            </div>
            <span className={getStatusBadgeClass(active_booking.status)}>
              {active_booking.status}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            background: 'var(--gray-50)',
            padding: '1.25rem',
            borderRadius: '10px',
            marginBottom: '1.25rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>{t('queueTokenNo')}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-600)' }}>
                {active_booking.token_number || `T_${active_booking.booking_id}`}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>{t('designatedCounter')}</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                {active_booking.mandi_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {active_booking.counter_name}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>{t('serviceDate')} & {t('scheduledSlot')}</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                {formatIndianDate(active_booking.service_date || active_booking.booking_time)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {formatIndianTime(active_booking.booking_time)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', textTransform: 'uppercase' }}>{t('crop')} & {t('approvedQty')}</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                {active_booking.crop_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                {active_booking.quantity_req} {t('quintals')}
              </div>
            </div>
          </div>

          {/* Policy lock or missed notice */}
          {active_booking.status === 'NOT_ARRIVED' && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              color: '#92400e',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} color="#b45309" />
              <span>{t('missedSlotNotice')}</span>
            </div>
          )}

          {active_booking.lock_reason && active_booking.status !== 'NOT_ARRIVED' && (
            <div style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              color: '#4b5563',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={18} color="#6b7280" />
              <span>
                {['CALLED', 'ARRIVED', 'PROCESSING'].includes(active_booking.status)
                  ? t('cannotCancelCalledOrArrived')
                  : t('lockWithin1Day')}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {active_booking.status !== 'NOT_ARRIVED' && (
              <button className="btn btn-primary" onClick={() => onNavigate('token')}>
                <Ticket size={18} /> {t('viewGatePass')}
              </button>
            )}

            {(active_booking.can_reschedule ?? (active_booking.status === 'NOT_ARRIVED')) && (
              <button className="btn btn-secondary" onClick={() => onReschedule(active_booking)}>
                <Clock size={18} /> {t('rescheduleSlot')}
              </button>
            )}

            {(active_booking.can_cancel ?? (active_booking.status === 'NOT_ARRIVED')) && (
              <button className="btn btn-outline" style={{ color: 'var(--red-600)', borderColor: 'var(--red-500)' }} onClick={() => onCancel(active_booking)}>
                <AlertCircle size={18} /> {t('cancelBooking')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card" style={{
          marginBottom: '2rem',
          background: 'linear-gradient(to right, #f0fdf4, #ffffff)',
          border: '1px dashed var(--primary-200)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-700)', marginBottom: '0.25rem' }}>
              {t('noActiveAppointment')}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--gray-600)' }}>
              {lang === 'hi' 
                ? 'उपार्जन केंद्र पर अपनी फसल लाने के लिए स्लॉट बुक करें और कतार टोकन प्राप्त करें।'
                : 'Ready to bring your harvest to the mandi? Book an appointment slot to get your fast-track queue token.'}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate('book-slot')}>
            <CalendarPlus size={18} /> {t('bookSlotBtn')}
          </button>
        </div>
      )}

      {/* Quota Progress Breakdown - Unified Global Session Quota Pool */}
      {quota_summary.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="card-title">
              <Scale size={20} color="var(--primary-600)" />
              <span>{t('globalQuotaTitle')}</span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-700)', background: 'var(--primary-50)', padding: '0.3rem 0.8rem', borderRadius: '20px', border: '1px solid var(--primary-200)' }}>
              {t('remainingQuota')}: {totalRemaining.toFixed(2)} {t('quintals')}
            </div>
          </div>

          {/* Educational Callout explaining the shared pool */}
          <div style={{ 
            background: 'var(--blue-50)', 
            border: '1px solid var(--blue-200)', 
            borderRadius: '8px', 
            padding: '0.75rem 1rem', 
            marginBottom: '1.25rem', 
            fontSize: '0.85rem', 
            color: 'var(--blue-900)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <CheckCircle2 size={18} style={{ color: 'var(--blue-600)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>{lang === 'hi' ? 'साझा सत्र कोटा नियम:' : 'Shared Session Quota:'}</strong> {t('globalQuotaNote')}
            </div>
          </div>

          {/* Master Global Pool Progress Bar */}
          <div style={{
            padding: '1.25rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid var(--gray-200)',
            borderRadius: '10px',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '6px' }}>
              <div>
                <strong style={{ fontSize: '1.05rem', color: 'var(--gray-900)' }}>
                  {lang === 'hi' ? 'कुल उपार्जन कोटा (सभी फसलें)' : 'Total Session Allocation (All Crops)'}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginLeft: '8px' }}>
                  ({verifiedLand.toFixed(2)} {t('eligibleAcres')} × {quotaPerAcre} QTL/Acre)
                </span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--primary-600)' }}>{totalSold.toFixed(2)} {t('quintals')}</span>
                <span style={{ color: 'var(--gray-400)' }}> / {totalAllocated.toFixed(2)} {t('quintals')}</span>
              </div>
            </div>

            <div className="progress-container" style={{ height: '12px', borderRadius: '6px' }}>
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${totalAllocated > 0 ? Math.min(100, Math.round((totalSold / totalAllocated) * 100)) : 0}%`,
                  borderRadius: '6px'
                }}
              ></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.6rem', flexWrap: 'wrap', gap: '6px' }}>
              <span>{lang === 'hi' ? 'कुल उपयोग' : 'Total Utilized'}: <strong>{totalAllocated > 0 ? Math.min(100, Math.round((totalSold / totalAllocated) * 100)) : 0}%</strong></span>
              <span style={{ color: totalRemaining > 0 ? 'var(--primary-700)' : 'var(--red-600)', fontWeight: 700 }}>
                {t('sharedRemaining')}: <strong>{totalRemaining.toFixed(2)} {t('quintals')}</strong>
              </span>
            </div>
          </div>

          {/* Crop-Wise Breakdown within the Shared Pool */}
          <div style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-700)' }}>
            {t('cropBreakdown')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {quota_summary.map((quota) => {
              const cropSold = Number(quota.crop_sold_quantity !== undefined ? quota.crop_sold_quantity : 0);
              const inProgress = Number(quota.active_booking_quantity || 0);

              return (
                <div key={`${quota.crop_id}-${quota.session_id}`} style={{
                  padding: '1rem',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '10px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '1rem', color: 'var(--gray-900)' }}>{quota.crop_name}</strong>
                      <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                        {quota.crop_type || 'Kharif'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}>
                      {quota.session_name}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--gray-600)' }}>{t('soldThisCrop')}:</span>
                      <strong style={{ color: cropSold > 0 ? 'var(--primary-600)' : 'var(--gray-500)' }}>
                        {cropSold.toFixed(2)} {t('quintals')}
                      </strong>
                    </div>

                    {inProgress > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: 'var(--gray-600)' }}>{lang === 'hi' ? 'सक्रिय बुकिंग' : 'In-Progress'}:</span>
                        <strong style={{ color: 'var(--blue-600)' }}>
                          {inProgress.toFixed(2)} {t('quintals')}
                        </strong>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed var(--gray-200)' }}>
                      <span style={{ color: 'var(--gray-600)' }}>{t('availableToSell')}:</span>
                      <strong style={{ color: totalRemaining > 0 ? 'var(--primary-700)' : 'var(--red-600)' }}>
                        {totalRemaining.toFixed(2)} {t('quintals')}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Bookings Mini List */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Clock size={20} color="var(--primary-600)" />
            <span>{t('recentBookings')}</span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => onNavigate('bookings')}
          >
            {lang === 'hi' ? 'सभी बुकिंग्स देखें' : 'View All Bookings'} <ArrowRight size={14} />
          </button>
        </div>

        {recent_bookings.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>{t('bookingRef')}</th>
                  <th>{t('designatedCounter')}</th>
                  <th>{t('crop')}</th>
                  <th>{t('approvedQty')}</th>
                  <th>{t('serviceDate')}</th>
                  <th>{t('scheduledSlot')}</th>
                  <th>{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {recent_bookings.map((b) => (
                  <tr key={b.booking_id}>
                    <td><strong>#BK-{b.booking_id}</strong></td>
                    <td>{b.mandi_name} <br/><span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{b.counter_name}</span></td>
                    <td>{b.crop_name}</td>
                    <td>{b.quantity_req} {t('quintals')}</td>
                    <td>{formatIndianDate(b.service_date || b.booking_time)}</td>
                    <td>{formatIndianTime(b.booking_time)}</td>
                    <td>
                      <span className={getStatusBadgeClass(b.status)}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--gray-500)', padding: '2rem' }}>
            {t('noBookings')}
          </p>
        )}
      </div>
    </div>
  );
}
