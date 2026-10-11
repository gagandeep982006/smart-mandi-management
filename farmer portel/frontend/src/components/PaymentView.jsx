import React, { useState, useEffect } from 'react';
import { farmerApi } from '../api';
import { formatIndianDate, formatIndianDateTime } from '../utils/dateUtils';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Building2, 
  RefreshCw, 
  AlertCircle, 
  ShieldCheck,
  Receipt,
  User,
  Copy,
  Check,
  ZoomIn,
  X
} from 'lucide-react';
import CircularLoader from './CircularLoader';

export default function PaymentView() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [enlargedScreenshot, setEnlargedScreenshot] = useState(false);
  const [copiedUtr, setCopiedUtr] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await farmerApi.getPayments();
      if (res.success) {
        setPayments(res.data || []);
      } else {
        setError(res.message || 'Failed to load payment history');
      }
    } catch (err) {
      setError(err.message || 'Error loading payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleCopyUtr = (utr) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  // Compute payment totals
  const totalGross = payments.reduce((acc, p) => acc + Number(p.total_payable_amount || p.total_amount || 0), 0);
  const totalPaid = payments
    .filter((p) => p.payment_status === 'PAID')
    .reduce((acc, p) => acc + Number(p.total_payable_amount || p.total_amount || 0), 0);
  const totalPending = totalGross - totalPaid;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> PAID</span>;
      case 'APPROVED':
        return <span className="badge badge-info"><Clock size={12} /> APPROVED</span>;
      case 'PENDING':
        return <span className="badge badge-warning"><Clock size={12} /> PENDING</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={24} color="var(--primary-600)" />
            Direct Benefit Transfer & Payment Vouchers
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            Track Minimum Support Price (MSP) disbursements, bank transfer proof receipts, and processing officer details.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchPayments}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* KPI Stats */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon green">
            <Receipt size={26} />
          </div>
          <div className="kpi-details">
            <span className="kpi-title">Total MSP Value</span>
            <span className="kpi-value">₹{totalGross.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            <span className="kpi-sub">Gross Delivered Value</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon blue">
            <CheckCircle2 size={26} />
          </div>
          <div className="kpi-details">
            <span className="kpi-title">Disbursed to Bank</span>
            <span className="kpi-value" style={{ color: 'var(--primary-600)' }}>
              ₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="kpi-sub">Direct Bank Settlement (PAID)</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber">
            <Clock size={26} />
          </div>
          <div className="kpi-details">
            <span className="kpi-title">Pending Settlement</span>
            <span className="kpi-value" style={{ color: 'var(--amber-600)' }}>
              ₹{totalPending.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
            <span className="kpi-sub">Under Verification/Approval</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-banner danger">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Payment Vouchers Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Building2 size={20} color="var(--primary-600)" />
            <span>Procurement Settlement Vouchers & Payment Proof</span>
          </div>
        </div>

        {loading ? (
          <CircularLoader size={40} text="Loading payment settlement records..." center />
        ) : payments.length > 0 ? (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Voucher / Ref ID</th>
                  <th>Booking Reference</th>
                  <th>Crop</th>
                  <th>Quantity Delivered</th>
                  <th>Rate / MSP</th>
                  <th>Payable Amount</th>
                  <th>Status</th>
                  <th>Disbursement Date & UTR</th>
                  <th>Proof & Officer</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.payment_id}>
                    <td>
                      <strong>#PAY-{p.payment_id}</strong>
                    </td>
                    <td>
                      #BK-{p.booking_id}
                    </td>
                    <td>
                      <strong>{p.crop_name}</strong>
                    </td>
                    <td>
                      {p.quantity_sold} Quintals
                    </td>
                    <td>
                      ₹{p.rate_per_unit || p.rate_applied || p.rate || '2,275'} / Qtl
                    </td>
                    <td>
                      <strong style={{ color: 'var(--gray-900)', fontSize: '0.95rem' }}>
                        ₹{Number(p.total_payable_amount || p.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </strong>
                    </td>
                    <td>
                      {getStatusBadge(p.payment_status)}
                    </td>
                    <td>
                      {p.payment_date ? (
                        <div>
                          <div>{formatIndianDate(p.payment_date)}</div>
                          {p.transaction_reference && (
                            <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600, fontFamily: 'monospace' }}>
                              UTR: {p.transaction_reference}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>Processing</span>
                      )}
                    </td>
                    <td>
                      {p.payment_status === 'PAID' ? (
                        <div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              borderRadius: '6px'
                            }}
                            onClick={() => setSelectedPayment(p)}
                            title="View official transfer slip, UTR, and payment officer details"
                          >
                            <Receipt size={14} />
                            <span>{p.screenshot ? 'View Proof' : 'View Voucher'}</span>
                          </button>
                          {p.operator_username && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--gray-600)', marginTop: '3px' }}>
                              By: <strong>{p.operator_username}</strong>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--gray-400)', fontSize: '0.78rem' }}>
                          Pending Settlement
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--gray-500)' }}>
            <Receipt size={44} color="var(--gray-300)" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ fontSize: '1.1rem', color: 'var(--gray-800)', marginBottom: '0.5rem' }}>
              No Payment Vouchers Yet
            </h4>
            <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
              Payment vouchers are generated automatically once your crop delivery is inspected and weighed at the Mandi counter.
            </p>
          </div>
        )}
      </div>

      {/* Payment Proof & Officer Details Modal */}
      {selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => { setSelectedPayment(null); setEnlargedScreenshot(false); }}
        >
          <div
            className="modal-container"
            style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#e8f5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1b5e20'
                }}>
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.2rem', marginBottom: '2px' }}>
                    Procurement Disbursal Voucher
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    Voucher Ref: #PAY-{selectedPayment.payment_id} • Booking #{selectedPayment.booking_id}
                  </span>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => { setSelectedPayment(null); setEnlargedScreenshot(false); }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '0 0.5rem' }}>
              {/* Status & Amount Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#166534', fontWeight: 600 }}>
                    Direct Benefit Transfer Amount
                  </span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#14532d', lineHeight: 1.2 }}>
                    ₹{Number(selectedPayment.total_payable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '4px' }}>
                    {selectedPayment.crop_name} • {selectedPayment.quantity_sold} Quintals @ ₹{selectedPayment.rate_per_unit || '2,275'}/Qtl
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {getStatusBadge(selectedPayment.payment_status)}
                  <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '6px' }}>
                    Mandi: <strong>{selectedPayment.mandi_name}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION 1: BANK UTR & PAYMENT PROOF */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Receipt size={17} color="var(--primary-600)" />
                  Payment Proof & Bank Settlement
                </h4>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '10px',
                  padding: '1rem'
                }}>
                  {/* UTR Highlight Box */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid var(--gray-300)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 600 }}>
                        Bank Transaction Reference / UTR Number
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 700, color: '#1e40af', letterSpacing: '0.04em' }}>
                        {selectedPayment.transaction_reference || 'N/A (Electronic Settlement)'}
                      </div>
                    </div>
                    {selectedPayment.transaction_reference && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '4px', fontSize: '0.75rem', padding: '4px 10px' }}
                        onClick={() => handleCopyUtr(selectedPayment.transaction_reference)}
                      >
                        {copiedUtr ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        <span>{copiedUtr ? 'Copied' : 'Copy UTR'}</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600 }}>DISBURSEMENT TIMESTAMP</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-800)', marginTop: '2px' }}>
                        {formatIndianDateTime(selectedPayment.proof_completion_date || selectedPayment.payment_date)}
                      </div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600 }}>DISBURSAL REMARKS / NOTES</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--gray-800)', marginTop: '2px' }}>
                        {selectedPayment.proof_notes || 'Direct bank settlement released against accepted crop inspection.'}
                      </div>
                    </div>
                  </div>

                  {/* Screenshot Receipt Preview */}
                  {selectedPayment.screenshot ? (
                    <div style={{
                      background: '#f8fafc',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-700)' }}>
                          Bank Transfer Confirmation Slip / Screenshot
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '3px 8px', gap: '4px' }}
                          onClick={() => setEnlargedScreenshot(true)}
                        >
                          <ZoomIn size={13} /> Enlarge
                        </button>
                      </div>
                      <div style={{
                        maxHeight: '240px',
                        overflow: 'hidden',
                        borderRadius: '6px',
                        background: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <img
                          src={selectedPayment.screenshot}
                          alt="Payment Proof Slip"
                          style={{
                            maxHeight: '240px',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            cursor: 'pointer'
                          }}
                          onClick={() => setEnlargedScreenshot(true)}
                          title="Click to view full size receipt"
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      background: '#eff6ff',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                      fontSize: '0.82rem',
                      color: '#1e40af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                      <span>Direct bank settlement confirmed via banking gateway. Physical copy is archived in the state audit registry.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: PAYMENT USER / OFFICER DETAILS */}
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={17} color="var(--primary-600)" />
                  Payment Officer & Processing Authority Details
                </h4>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '10px',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '0.85rem'
                  }}>
                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600 }}>OFFICER USERNAME</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gray-900)', marginTop: '2px' }}>
                        {selectedPayment.operator_username || 'Government Payment Officer'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600 }}>OFFICIAL DESIGNATION</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534', marginTop: '2px', textTransform: 'capitalize' }}>
                        {selectedPayment.operator_role ? selectedPayment.operator_role.replace(/_/g, ' ') : 'State Payment Officer'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600 }}>STATE / JURISDICTION</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-800)', marginTop: '2px' }}>
                        {selectedPayment.operator_state_name || 'State DBT Procurement Division'}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', fontWeight: 600 }}>OFFICER ID</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-800)', marginTop: '2px' }}>
                        #{selectedPayment.operator_id ? selectedPayment.operator_id : 'GOV-PY'}
                      </div>
                    </div>
                  </div>

                  {/* Security Verification Stamp */}
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.8rem',
                    color: '#15803d'
                  }}>
                    <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                    <span>Verified and released through Government State Payment Portal under MSP Procurement DBT Guidelines.</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setSelectedPayment(null); setEnlargedScreenshot(false); }}
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Screenshot Modal */}
      {enlargedScreenshot && selectedPayment?.screenshot && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100, background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setEnlargedScreenshot(false)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e293b'
              }}
              onClick={() => setEnlargedScreenshot(false)}
              aria-label="Close enlarged receipt"
            >
              <X size={18} />
            </button>
            <img
              src={selectedPayment.screenshot}
              alt="Full Size Disbursal Proof"
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
