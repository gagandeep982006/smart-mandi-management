import React, { useState, useEffect } from 'react';
import { farmerApi } from '../api';
import { formatIndianDate, formatIndianDateTime } from '../utils/dateUtils';
import { 
  History, 
  Sprout, 
  Calendar, 
  Scale, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp,
  CheckCircle2,
  Database,
  ChevronLeft,
  ChevronRight,
  Clock,
  Ticket
} from 'lucide-react';

export default function HistoryView() {
  const [activeSubTab, setActiveSubTab] = useState('sales'); // 'sales' (MySQL) | 'recent' (MongoDB)
  
  // Sales History (MySQL)
  const [salesHistory, setSalesHistory] = useState([]);
  const [salesTransactions, setSalesTransactions] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesLoadingMore, setSalesLoadingMore] = useState(false);
  const [salesPage, setSalesPage] = useState(1);
  const [salesHasMore, setSalesHasMore] = useState(false);
  const [salesTotalRecords, setSalesTotalRecords] = useState(0);
  const [salesError, setSalesError] = useState('');
  const [historyYears, setHistoryYears] = useState(5);

  // Recent History (MongoDB)
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchSalesHistory = async (targetPage = 1, append = false) => {
    if (append) {
      setSalesLoadingMore(true);
    } else {
      setSalesLoading(true);
      setSalesError('');
    }
    try {
      const res = await farmerApi.getHistory(targetPage, 10);
      if (res.success) {
        if (append) {
          setSalesHistory(prev => {
            const merged = [...prev];
            (res.data || []).forEach(newSession => {
              const existingIdx = merged.findIndex(s => s.session_id === newSession.session_id && s.crop_id === newSession.crop_id);
              if (existingIdx !== -1) {
                const existingTrips = merged[existingIdx].sales_transactions || [];
                const newTrips = (newSession.sales_transactions || []).filter(
                  nt => !existingTrips.some(et => et.booking_id === nt.booking_id)
                );
                merged[existingIdx] = {
                  ...merged[existingIdx],
                  ...newSession,
                  sales_transactions: [...existingTrips, ...newTrips]
                };
              } else {
                merged.push(newSession);
              }
            });
            return merged;
          });
          setSalesTransactions(prev => [...prev, ...(res.items || [])]);
        } else {
          setSalesHistory(res.data || []);
          setSalesTransactions(res.items || []);
        }
        setSalesPage(targetPage);
        setSalesHasMore(Boolean(res.pagination?.has_more));
        setSalesTotalRecords(res.pagination?.total || 0);
        if (res.history_years_configured) {
          setHistoryYears(res.history_years_configured);
        }
      } else {
        setSalesError(res.message || 'Failed to load sales history');
      }
    } catch (err) {
      setSalesError(err.message || 'Error loading sales history');
    } finally {
      setSalesLoading(false);
      setSalesLoadingMore(false);
    }
  };

  const handleLoadMoreSales = () => {
    if (!salesLoadingMore && salesHasMore) {
      fetchSalesHistory(salesPage + 1, true);
    }
  };

  const fetchRecentBookings = async (targetPage = 1) => {
    setRecentLoading(true);
    setRecentError('');
    try {
      const res = await farmerApi.getRecentBookings(targetPage, 10);
      if (res.success && res.data) {
        setRecentBookings(res.data.items || []);
        setPage(res.data.page || 1);
        setTotalPages(res.data.totalPages || 1);
        setTotalRecords(res.data.total || 0);
      } else {
        setRecentError(res.message || 'Failed to load recent booking records');
      }
    } catch (err) {
      setRecentError(err.message || 'Error loading recent booking records');
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'recent') {
      fetchRecentBookings(page);
    }
  }, [activeSubTab, page]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'COMPLETED': return 'badge badge-success';
      case 'CANCELLED': return 'badge badge-danger';
      case 'WAITING':
      case 'BOOKED': return 'badge badge-warning';
      case 'CALLED':
      case 'PROCESSING': return 'badge badge-info';
      default: return 'badge badge-secondary';
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={24} color="var(--primary-600)" />
            Procurement & Activity History
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            Authoritative audit trail of past procurement sales, quota deductions, and recent booking activity.
          </p>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={() => activeSubTab === 'sales' ? fetchSalesHistory() : fetchRecentBookings(page)}
        >
          <RefreshCw size={15} /> Refresh Records
        </button>
      </div>

      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        borderBottom: '2px solid var(--gray-200)',
        paddingBottom: '0.5rem'
      }}>
        <button
          onClick={() => setActiveSubTab('sales')}
          style={{
            padding: '0.6rem 1.25rem',
            border: 'none',
            borderRadius: '8px',
            background: activeSubTab === 'sales' ? 'var(--primary-600)' : 'transparent',
            color: activeSubTab === 'sales' ? '#ffffff' : 'var(--gray-600)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <Scale size={16} /> Completed Sales History (MySQL Archive)
        </button>

        <button
          onClick={() => setActiveSubTab('recent')}
          style={{
            padding: '0.6rem 1.25rem',
            border: 'none',
            borderRadius: '8px',
            background: activeSubTab === 'recent' ? 'var(--primary-600)' : 'transparent',
            color: activeSubTab === 'recent' ? '#ffffff' : 'var(--gray-600)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          <Database size={16} /> Recent Activity (MongoDB History)
        </button>
      </div>

      {/* TAB 1: Completed Sales History (MySQL) */}
      {activeSubTab === 'sales' && (
        <>
          <div className="alert-banner info" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            <span>
              <strong>Continuous Multi-Sale Tracking ({historyYears}-Year Retention):</strong> As you deliver partial harvest shipments throughout an active session, each sale automatically deducts from your approved quota until your allocation is fulfilled.
            </span>
          </div>

          {salesError && (
            <div className="alert-banner danger" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{salesError}</span>
            </div>
          )}

          {salesLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
              <span>Loading historical sales records from primary database...</span>
            </div>
          ) : salesHistory.length > 0 ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {salesHistory.map((item, idx) => {
                const allocated = Number(item.allocated_quantity || 0);
                const totalSold = Number(item.total_sold_quantity || 0);
                const remaining = Number(item.remaining_quantity || 0);
                const pct = allocated > 0 ? Math.min(100, Math.round((totalSold / allocated) * 100)) : 0;
                const trips = item.sales_transactions || [];

                return (
                  <div key={idx} className="card">
                    {/* Header for Session & Crop */}
                    <div className="card-header" style={{ marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sprout size={20} color="var(--primary-600)" />
                          <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                            {item.crop_name}
                          </span>
                          <span className="badge badge-primary">{item.session_name}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '4px' }}>
                          Eligible Land: <strong>{item.eligible_land_acres || item.eligible_land} Acres</strong> • Quota Rate: <strong>{item.quota_per_acre} Qtl/Acre</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Delivered to Date</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                          {totalSold.toFixed(2)} / {allocated.toFixed(2)} Qtl
                        </div>
                      </div>
                    </div>

                    {/* Quota Progress Bar */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div className="progress-container" style={{ height: '12px' }}>
                        <div className="progress-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: '4px' }}>
                        <span>Progress: <strong>{pct}% Fulfilled</strong> ({trips.length} Completed Delivery Trips)</span>
                        <span>Remaining Balance: <strong style={{ color: remaining > 0 ? 'var(--primary-700)' : 'var(--gray-500)' }}>{remaining.toFixed(2)} Qtl</strong></span>
                      </div>
                    </div>

                    {/* Sub-table of individual trips */}
                    <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--gray-700)', marginBottom: '0.75rem', fontWeight: 600 }}>
                        Delivery Transactions for this Session:
                      </h4>

                      {trips.length > 0 ? (
                        <div className="table-responsive">
                          <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                            <thead>
                              <tr>
                                <th>Trip #</th>
                                <th>Booking Ref</th>
                                <th>Mandi / Counter</th>
                                <th>Service Date</th>
                                <th>Delivered Qty</th>
                                <th>Rate / MSP</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trips.map((tr, tIdx) => (
                                <tr key={tIdx}>
                                  <td><strong>Trip #{tIdx + 1}</strong></td>
                                  <td>#BK-{tr.booking_id}</td>
                                  <td>{tr.mandi_name || 'Mandi'} ({tr.counter_name || 'Counter'})</td>
                                  <td>{formatIndianDate(tr.service_date || tr.booking_time)}</td>
                                  <td>
                                    <strong style={{ color: 'var(--primary-700)' }}>
                                      {Number(tr.quantity_sold || tr.quantity_approved || 0).toFixed(2)} Qtl
                                    </strong>
                                  </td>
                                  <td>₹{tr.rate_per_unit || '2275'}/Qtl</td>
                                  <td>
                                    <span className="badge badge-success">COMPLETED</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                          No completed deliveries recorded for this crop yet.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination: Load More Completed Sales Records */}
            <div style={{ textAlign: 'center', marginTop: '1.75rem', marginBottom: '1.5rem' }}>
              {salesHasMore ? (
                <button
                  className="btn btn-secondary"
                  onClick={handleLoadMoreSales}
                  disabled={salesLoadingMore}
                  style={{ minWidth: '220px', padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                >
                  {salesLoadingMore ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Loading more sales...
                    </>
                  ) : (
                    <>Load More Sales Records ({salesTransactions.length} of {salesTotalRecords})</>
                  )}
                </button>
              ) : salesTransactions.length > 0 ? (
                <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)', fontStyle: 'italic' }}>
                  ✓ All {salesTotalRecords || salesTransactions.length} completed sales records loaded
                </span>
              ) : null}
            </div>
          </>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem', color: 'var(--gray-500)' }}>
              <History size={48} color="var(--gray-300)" style={{ margin: '0 auto 1rem' }} />
              <h4 style={{ fontSize: '1.1rem', color: 'var(--gray-800)', marginBottom: '0.5rem' }}>
                No Completed Sales Found
              </h4>
              <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
                Historical sales records will display here after you bring your harvest to the mandi and weighment is completed.
              </p>
            </div>
          )}
        </>
      )}

      {/* TAB 2: Recent Activity (MongoDB History) */}
      {activeSubTab === 'recent' && (
        <>
          <div className="alert-banner info" style={{ marginBottom: '1.5rem' }}>
            <Database size={20} style={{ flexShrink: 0 }} />
            <span>
              <strong>Fast NoSQL Audit Trail:</strong> Showing booking events from the past 30 days stored in MongoDB for high-speed indexing and quick status lookups. Total records found: <strong>{totalRecords}</strong>.
            </span>
          </div>

          {recentError && (
            <div className="alert-banner danger" style={{ marginBottom: '1.5rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{recentError}</span>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Clock size={20} color="var(--primary-600)" />
                <span>Recent Booking Records (Page {page} of {totalPages || 1})</span>
              </div>
            </div>

            {recentLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                <span>Retrieving recent history from MongoDB...</span>
              </div>
            ) : recentBookings.length > 0 ? (
              <>
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Requested Qty</th>
                        <th>Approved Qty</th>
                        <th>Scheduled Time</th>
                        <th>Status</th>
                        <th>Logged At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentBookings.map((rb) => (
                        <tr key={rb._id || rb.booking_id}>
                          <td><strong>#BK-{rb.booking_id}</strong></td>
                          <td>{rb.quantity_req} Qtl</td>
                          <td><strong>{rb.quantity_approved || rb.quantity_req} Qtl</strong></td>
                          <td>{formatIndianDateTime(rb.booking_time)}</td>
                          <td>
                            <span className={getStatusBadgeClass(rb.status)}>
                              {rb.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>
                            {formatIndianDateTime(rb.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--gray-200)',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    Showing Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong> ({totalRecords} Total Bookings)
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      disabled={page <= 1 || recentLoading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>

                    <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem' }}>
                      {page}
                    </span>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      disabled={page >= totalPages || recentLoading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--gray-500)' }}>
                <Clock size={40} color="var(--gray-300)" style={{ margin: '0 auto 0.75rem' }} />
                <h4 style={{ fontSize: '1.05rem', color: 'var(--gray-800)', marginBottom: '0.25rem' }}>
                  No Activity in the Last 30 Days
                </h4>
                <p style={{ fontSize: '0.85rem' }}>
                  No recent bookings were recorded in the MongoDB event store during the configured retention period.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
