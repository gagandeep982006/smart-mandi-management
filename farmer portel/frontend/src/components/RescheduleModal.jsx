import React, { useState, useEffect, useRef } from 'react';
import { farmerApi } from '../api';
import { Clock, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import CircularLoader from './CircularLoader';
import { formatIndianTime, formatIndianDate } from '../utils/dateUtils';

export default function RescheduleModal({ booking, onClose, onSuccess }) {
  const [serviceDate, setServiceDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotMeta, setSlotMeta] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

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
  const canReschedule = (booking.can_reschedule !== undefined)
    ? booking.can_reschedule
    : (!isCalledOrArrived && (isNotArrived || daysUntil >= 2));

  let blockedMessage = null;
  if (!canReschedule) {
    if (isCalledOrArrived) {
      blockedMessage = "Cannot reschedule your booking once you have been called or arrived at the mandi.";
    } else if (!isNotArrived && daysUntil < 2) {
      blockedMessage = "Rescheduling is only permitted at least 2 days prior to your scheduled appointment. You cannot reschedule on or 1 day before your appointment date.";
    }
  }

  const getMinRescheduleDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const minRescheduleDateStr = getMinRescheduleDateStr();

  // Set initial date: must be at least 1 full day after current date (minimum 2 days ahead of today)
  useEffect(() => {
    const minStr = getMinRescheduleDateStr();
    if (booking.service_date && booking.status !== 'NOT_ARRIVED') {
      const d = new Date(booking.service_date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const bookingDateStr = `${yyyy}-${mm}-${dd}`;
      setServiceDate(bookingDateStr >= minStr ? bookingDateStr : minStr);
    } else {
      setServiceDate(minStr);
    }
  }, [booking]);

  // Load slots when serviceDate changes
  useEffect(() => {
    const mandiId = booking.mandi_id || booking.mandiId;
    const counterId = booking.counter_id || booking.counterId;
    if (!mandiId || !counterId || !serviceDate) return;

    async function fetchSlots() {
      setLoading(true);
      setError('');
      try {
        const res = await farmerApi.getAvailableSlots(mandiId, counterId, serviceDate, booking.booking_id);
        if (res.success) {
          setSlots(res.data.slots || []);
          setSlotMeta(res.data);
          if (res.data.is_full) {
            setError(res.data.message || 'Mandi is full for today for this crop.');
          }
        } else {
          setError(res.message || 'No slots available for this date');
          setSlotMeta(null);
        }
      } catch (err) {
        setError(err.message || 'Error loading slots');
        setSlots([]);
        setSlotMeta(null);
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, [booking, serviceDate]);

  const handleReschedule = async () => {
    if (!canReschedule) return;
    if (!serviceDate || !selectedSlot) {
      setError('Please choose a date and time slot.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        service_date: serviceDate,
        booking_time: selectedSlot.start_time,
        counter_id: booking.counter_id || booking.counterId,
        mandi_id: booking.mandi_id || booking.mandiId
      };

      const res = await farmerApi.rescheduleBooking(booking.booking_id, payload);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || 'Failed to reschedule slot');
      }
    } catch (err) {
      setError(err.message || 'Error occurred during rescheduling');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={22} color="var(--primary-600)" />
            Reschedule Procurement Appointment
          </div>
          <button className="modal-close" onClick={onClose} disabled={submitting}>
            <X size={20} />
          </button>
        </div>

        {blockedMessage && (
          <div className="alert-banner danger" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{blockedMessage}</span>
          </div>
        )}

        {error && (
          <div ref={errorRef} className="alert-banner danger">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{
          background: 'var(--gray-50)',
          borderRadius: '10px',
          padding: '1rem',
          border: '1px solid var(--gray-200)',
          marginBottom: '1.25rem',
          fontSize: '0.875rem'
        }}>
          <div><strong>Booking Reference:</strong> #BK-{booking.booking_id}</div>
          <div><strong>Mandi & Counter:</strong> {booking.mandi_name} ({booking.counter_name})</div>
          <div><strong>Crop & Quantity:</strong> {booking.crop_name} ({booking.quantity_req} Qtl)</div>
          <div><strong>Current Appointment:</strong> {formatIndianDate(booking.service_date || booking.booking_time)} at {formatIndianTime(booking.booking_time)}</div>
        </div>

        <div className="form-group" style={{ maxWidth: '280px' }}>
          <label className="form-label">Select New Service Date</label>
          <input
            type="date"
            className="form-control"
            value={serviceDate}
            min={minRescheduleDateStr}
            onChange={(e) => {
              setServiceDate(e.target.value);
              setSelectedSlot(null);
            }}
          />
        </div>

        {slotMeta?.is_full && (
          <div className="alert-banner danger" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>Mandi is full for today. Counter daily intake capacity reached on {serviceDate}.</span>
          </div>
        )}

        {slotMeta && !slotMeta.is_working && (
          <div className="alert-banner danger" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>The Mandi is closed on {formatIndianDate(serviceDate)}. Please select another appointment date.</span>
          </div>
        )}

        {slotMeta?.has_pending_timing_change && (
          <div 
            style={{ 
              marginBottom: '1rem', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              backgroundColor: '#eff6ff', 
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '0.8rem',
              color: '#1e40af'
            }}
          >
            <Clock size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              {slotMeta.is_timing_pending_applied ? (
                <div>
                  <strong>Updated Operating Schedule Active:</strong> Showing slots for new operating hours ({formatIndianTime(slotMeta.pending_opening_time)} — {formatIndianTime(slotMeta.pending_closing_time)}). <span style={{ display: 'block', marginTop: '2px', color: '#1d4ed8' }}>This change will take effect from {formatIndianDate(slotMeta.timing_effective_date)}.</span>
                </div>
              ) : (
                <div>
                  <strong>Active Schedule in Effect:</strong> Slots follow current active hours ({formatIndianTime(slotMeta.active_opening_time)} — {formatIndianTime(slotMeta.active_closing_time)}). Facility hours will change to <strong>{formatIndianTime(slotMeta.pending_opening_time)} — {formatIndianTime(slotMeta.pending_closing_time)}</strong>. <span style={{ display: 'block', marginTop: '2px', color: '#1d4ed8' }}>This change will take effect from {formatIndianDate(slotMeta.timing_effective_date)}.</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0 }}>Select New Time Slot</label>
            {slotMeta?.opening_time && (
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 600 }}>
                Hours: {slotMeta.opening_time.slice(0, 5)} — {slotMeta.closing_time.slice(0, 5)}
              </span>
            )}
          </div>
          {loading ? (
            <CircularLoader size={34} text="Checking counter slot availability..." center />
          ) : slots.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.65rem' }}>
              {slots.filter(s => s.status !== 'PAST' && !s.is_past).map((slot, idx) => {
                const isAvailable = slot.status === 'AVAILABLE' && !slotMeta?.is_full;
                const isSelected = selectedSlot?.start_time === slot.start_time;
                const isFull = slot.status === 'FULL' || slotMeta?.is_full;

                return (
                  <div
                    key={idx}
                    onClick={() => isAvailable && setSelectedSlot(slot)}
                    style={{
                      padding: '0.65rem 0.5rem',
                      borderRadius: '8px',
                      border: isSelected 
                        ? '2px solid var(--primary-600)' 
                        : isAvailable 
                        ? '1px solid var(--gray-300)' 
                        : '1px solid var(--gray-200)',
                      background: isSelected 
                        ? 'var(--primary-50)' 
                        : isAvailable 
                        ? '#ffffff' 
                        : 'var(--gray-100)',
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      opacity: isAvailable ? 1 : 0.6,
                      textAlign: 'center',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {formatIndianTime(slot.start_time)} - {formatIndianTime(slot.end_time)}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: isFull ? 'var(--red-600)' : isAvailable ? 'var(--primary-700)' : 'var(--gray-500)',
                      fontWeight: 600,
                      marginTop: '2px'
                    }}>
                      {isFull ? 'Full' : isAvailable ? 'Available' : 'Booked'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="alert-banner warning">
              <AlertCircle size={18} />
              <span>No operating slots available for this date. Please pick a working business day.</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleReschedule} 
            disabled={submitting || !selectedSlot || slotMeta?.is_full || !canReschedule}
          >
            {submitting ? (
              <>
                <CircularLoader size={16} strokeWidth={2.5} color="#ffffff" style={{ marginRight: '6px' }} /> Rescheduling...
              </>
            ) : (
              'Confirm New Slot'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
