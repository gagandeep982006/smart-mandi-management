import React, { useState, useEffect } from 'react';
import { farmerApi } from '../api';
import { formatIndianTime, formatIndianDate } from '../utils/dateUtils';
import { 
  CalendarCheck2, 
  Clock, 
  Ticket, 
  CreditCard, 
  AlertCircle, 
  Search,
} from 'lucide-react';
import CircularLoader from './CircularLoader';

export default function BookingsList({ onNavigate, onReschedule, onCancel }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const fetchBookings = async (targetPage = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError('');
    }
    try {
      const res = await farmerApi.getBookings(targetPage, 10);
      if (res.success) {
        if (append) {
          setBookings(prev => [...prev, ...(res.data || [])]);
        } else {
          setBookings(res.data || []);
        }
        setPage(targetPage);
        setHasMore(Boolean(res.pagination?.has_more));
        setTotalRecords(res.pagination?.total || (res.data?.length || 0));
      } else {
        setError(res.message || 'Failed to load bookings');
      }
    } catch (err) {
      setError(err.message || 'Error occurred while loading bookings');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchBookings(page + 1, true);
    }
  };

  useEffect(() => {
    fetchBookings(1, false);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BOOKED':
      case 'WAITING':
        return <span className="badge badge-warning">{status}</span>;
      case 'CALLED':
      case 'ARRIVED':
      case 'PROCESSING':
        return <span className="badge badge-info">{status}</span>;
      case 'COMPLETED':
        return <span className="badge badge-success">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">CANCELLED</span>;
      case 'NOT_ARRIVED':
        return <span className="badge badge-secondary">NOT ARRIVED</span>;
      case 'RESCHEDULED':
        return <span className="badge badge-secondary">RESCHEDULED</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const isActiveBooking = (status) => {
    return ['BOOKED', 'WAITING', 'CALLED', 'ARRIVED', 'PROCESSING', 'NOT_ARRIVED'].includes(status);
  };

  // Filter logic
  const filteredBookings = bookings.filter((b) => {
    // Status category filter
    if (filterStatus === 'ACTIVE' && !isActiveBooking(b.status)) return false;
    if (filterStatus === 'COMPLETED' && b.status !== 'COMPLETED') return false;
    if (filterStatus === 'CANCELLED' && !['CANCELLED', 'NOT_ARRIVED', 'RESCHEDULED'].includes(b.status)) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCrop = b.crop_name?.toLowerCase().includes(q);
      const matchMandi = b.mandi_name?.toLowerCase().includes(q);
      const matchToken = b.token_number?.toLowerCase().includes(q);
      const matchId = String(b.booking_id).includes(q);
      return matchCrop || matchMandi || matchToken || matchId;
    }

    return true;
  });

  // Sort logic: waiting / ongoing first, then completed, then rescheduled / cancelled, sorted by latest time
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const getStatusPriority = (status) => {
      if (['CALLED', 'PROCESSING', 'ARRIVED', 'WAITING', 'BOOKED'].includes(status)) return 1;
      if (status === 'COMPLETED') return 2;
      if (['RESCHEDULED', 'CANCELLED', 'NOT_ARRIVED'].includes(status)) return 3;
      return 4;
    };

    const pA = getStatusPriority(a.status);
    const pB = getStatusPriority(b.status);
    if (pA !== pB) return pA - pB;

    // Latest booking date/time first
    const timeA = new Date(a.booking_time || a.service_date || 0).getTime();
    const timeB = new Date(b.booking_time || b.service_date || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarCheck2 size={24} color="var(--primary-600)" />
            My Mandi Bookings & Appointments
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            Track active appointments, gate queue passes, and past delivery records.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => onNavigate('book-slot')}>
          + Book New Slot
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: filterStatus === tab ? '1px solid var(--primary-600)' : '1px solid var(--gray-300)',
                  background: filterStatus === tab ? 'var(--primary-50)' : '#ffffff',
                  color: filterStatus === tab ? 'var(--primary-700)' : 'var(--gray-600)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} color="var(--gray-400)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search crop, mandi, token..."
              className="form-control"
              style={{ paddingLeft: '32px', fontSize: '0.85rem', padding: '0.5rem 0.5rem 0.5rem 32px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-banner danger">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <CircularLoader size={40} text="Loading appointments & bookings..." center />
      ) : sortedBookings.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sortedBookings.map((b) => {
            const active = isActiveBooking(b.status);
            return (
              <div
                key={b.booking_id}
                className="card"
                style={{
                  borderLeft: active ? '5px solid var(--primary-500)' : '1px solid var(--gray-200)',
                  padding: '1.25rem 1.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                      Booking #BK-{b.booking_id}
                    </span>
                    {b.token_number && (
                      <span style={{
                        background: 'var(--primary-50)',
                        color: 'var(--primary-700)',
                        border: '1px solid var(--primary-200)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        🎟️ {b.token_number}
                      </span>
                    )}
                  </div>
                  <div>{getStatusBadge(b.status)}</div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  background: 'var(--gray-50)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Mandi & Counter</span>
                    <strong>{b.mandi_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Counter: {b.counter_name}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Crop & Quantity</span>
                    <strong>{b.crop_name}</strong>
                    <div style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{b.quantity_req} Quintals</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Appointment Date</span>
                    <strong>{formatIndianDate(b.service_date || b.booking_time)}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Slot: {formatIndianTime(b.booking_time)}</div>
                  </div>

                  <div>
                    <span style={{ color: 'var(--gray-500)', display: 'block', fontSize: '0.75rem' }}>Session</span>
                    <strong>{b.session_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Booked on: {formatIndianDate(b.created_at)}</div>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {b.status === 'NOT_ARRIVED' && (
                    <div style={{ marginRight: 'auto', fontSize: '0.8rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={14} />
                      <span>Missed slot: You can reschedule to a new available date or cancel.</span>
                    </div>
                  )}

                  {(!b.can_reschedule || !b.can_cancel) && b.lock_reason && active && b.status !== 'NOT_ARRIVED' && (
                    <div style={{ marginRight: 'auto', fontSize: '0.78rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={14} />
                      <span>{b.lock_reason}</span>
                    </div>
                  )}

                  {active && b.status !== 'NOT_ARRIVED' && (
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem' }}
                      onClick={() => onNavigate('token')}
                    >
                      <Ticket size={15} /> View Token Pass
                    </button>
                  )}

                  {(b.can_reschedule ?? (b.status === 'NOT_ARRIVED')) && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem' }}
                      onClick={() => onReschedule(b)}
                    >
                      <Clock size={15} /> Reschedule
                    </button>
                  )}

                  {(b.can_cancel ?? (b.status === 'NOT_ARRIVED')) && (
                    <button
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem', color: 'var(--red-600)', borderColor: 'var(--red-500)' }}
                      onClick={() => onCancel(b)}
                    >
                      <AlertCircle size={15} /> Cancel
                    </button>
                  )}

                  {b.status === 'COMPLETED' && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.825rem' }}
                      onClick={() => onNavigate('payments')}
                    >
                      <CreditCard size={15} /> View Payment Voucher
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination: Load More Bookings */}
        <div style={{ textAlign: 'center', marginTop: '1.75rem', marginBottom: '1.5rem' }}>
          {hasMore ? (
            <button
              className="btn btn-secondary"
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{ minWidth: '220px', padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
            >
              {loadingMore ? (
                <>
                  <CircularLoader size={16} strokeWidth={2.5} style={{ marginRight: '6px' }} /> Loading more...
                </>
              ) : (
                <>Load More Bookings ({bookings.length} of {totalRecords})</>
              )}
            </button>
          ) : bookings.length > 0 ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
              ✓ All {totalRecords || bookings.length} bookings loaded
            </span>
          ) : null}
        </div>
      </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
          <p style={{ marginBottom: '1rem', fontSize: '1rem' }}>No bookings matching current criteria.</p>
          <button className="btn btn-primary" onClick={() => onNavigate('book-slot')}>
            Book a Procurement Slot Now
          </button>
        </div>
      )}
    </div>
  );
}
