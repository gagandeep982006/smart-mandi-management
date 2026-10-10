import React, { useState } from 'react';
import { farmerApi } from '../api';
import { AlertCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { formatIndianTime, formatIndianDate } from '../utils/dateUtils';

export default function CancelModal({ booking, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!booking) return null;

  const isCalledOrArrived = ['CALLED', 'ARRIVED', 'PROCESSING', 'COMPLETED'].includes(booking.status);
  const isNotArrived = booking.status === 'NOT_ARRIVED';

  const getDaysUntil = () => {
    const dateInput = booking.booking_time || booking.service_date;
    if (!dateInput) return 0;
    const dateStr = typeof dateInput === 'string' ? dateInput.substring(0, 10) : '';
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [appY, appM, appD] = dateStr.split('-').map(Number);
    const [todY, todM, todD] = todayStr.split('-').map(Number);
    if (!appY || !todY) return 0;
    const appUtc = Date.UTC(appY, appM - 1, appD);
    const todUtc = Date.UTC(todY, todM - 1, todD);
    return Math.round((appUtc - todUtc) / (1000 * 60 * 60 * 24));
  };

  const daysUntil = getDaysUntil();
  const canCancel = (booking.can_cancel !== undefined)
    ? booking.can_cancel
    : (!isCalledOrArrived && (isNotArrived || daysUntil >= 2));

  let blockedMessage = null;
  if (!canCancel) {
    if (booking.lock_reason) {
      blockedMessage = booking.lock_reason;
    } else if (isCalledOrArrived) {
      blockedMessage = "Cannot cancel your booking once you have been called or arrived at the mandi.";
    } else if (!isNotArrived && daysUntil < 2) {
      blockedMessage = "Cancellation is only permitted at least 2 days prior to your scheduled appointment. You cannot cancel on or 1 day before your appointment date.";
    }
  }

  const handleCancel = async () => {
    if (!canCancel) return;
    setLoading(true);
    setError('');
    try {
      const res = await farmerApi.cancelBooking(booking.booking_id);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || 'Failed to cancel booking');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while cancelling booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--red-600)' }}>
            <AlertCircle size={22} />
            Cancel Procurement Slot
          </div>
          <button className="modal-close" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {blockedMessage && (
          <div className="alert-banner danger" style={{ marginBottom: '1.25rem' }}>
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <span>{blockedMessage}</span>
          </div>
        )}

        {error && (
          <div className="alert-banner danger">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <p style={{ color: 'var(--gray-700)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
          Are you sure you want to cancel booking <strong>#BK-{booking.booking_id}</strong>?
        </p>

        <div style={{
          background: 'var(--gray-50)',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid var(--gray-200)',
          marginBottom: '1.5rem',
          fontSize: '0.875rem'
        }}>
          <div><strong>Mandi:</strong> {booking.mandi_name}</div>
          <div><strong>Scheduled Date:</strong> {formatIndianDate(booking.service_date || booking.booking_time)} at {formatIndianTime(booking.booking_time)}</div>
          <div><strong>Crop & Quantity:</strong> {booking.crop_name} ({booking.quantity_req} Qtl)</div>
        </div>

        <div style={{
          background: '#fef2f2',
          border: '1px solid #fee2e2',
          padding: '0.85rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          color: '#991b1b',
          marginBottom: '1.5rem'
        }}>
          Cancelling will release your reserved slot back to other farmers, and your quota of {booking.quantity_req} Quintals will be immediately credited back to your available balance.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Keep Booking
          </button>
          <button className="btn btn-danger" onClick={handleCancel} disabled={loading || !canCancel}>
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
