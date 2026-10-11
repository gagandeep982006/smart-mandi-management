import React, { useState, useEffect } from "react";
import {
    X,
    ShieldCheck,
    User,
    Building2,
    Store,
    CreditCard,
    FileText,
    History,
    Receipt,
    ZoomIn,
    CheckCircle2
} from "lucide-react";
import { apiRequest } from "../../api/client";
import LoadingSpinner from "../common/LoadingSpinner";
import StatusBadge from "../common/StatusBadge";

export default function PaymentDetailsModal({ paymentId, isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [paymentData, setPaymentData] = useState(null);
    const [error, setError] = useState(null);
    const [enlargedImage, setEnlargedImage] = useState(false);

    useEffect(() => {
        if (!isOpen || !paymentId) return;

        let isMounted = true;
        async function fetchDetails() {
            setLoading(true);
            setError(null);
            try {
                const res = await apiRequest(`/payments/${paymentId}`);
                if (res.success && isMounted) {
                    setPaymentData(res.data);
                } else if (isMounted) {
                    setError(res.message || "Failed to load payment details");
                }
            } catch (err) {
                if (isMounted) setError(err.message || "Failed to retrieve payment information");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchDetails();
        return () => { isMounted = false; };
    }, [isOpen, paymentId]);

    if (!isOpen) return null;

    const p = paymentData?.payment;
    const f = paymentData?.farmer;
    const b = paymentData?.bank;
    const lands = paymentData?.lands || [];
    const m = paymentData?.mandi;
    const c = paymentData?.counter;
    const bk = paymentData?.booking;
    const tk = paymentData?.token;
    const auditLogs = paymentData?.auditLogs || [];
    const proof = paymentData?.proof;
    const cu = paymentData?.generating_counter_user;

    return (
        <>
            <div className="modal-overlay">
                <div className="modal-container" style={{ maxWidth: "860px" }}>
                    {/* Header */}
                    <div className="modal-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <h3 className="modal-title">Payment #{paymentId} Details</h3>
                            {p && <StatusBadge status={p.payment_status} />}
                        </div>
                        <button className="modal-close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="modal-body">
                        {loading ? (
                            <LoadingSpinner text="Retrieving comprehensive payment details..." />
                        ) : error ? (
                            <div className="alert alert-danger">{error}</div>
                        ) : paymentData ? (
                            <>
                                {/* Navigation Tabs */}
                                <div className="modal-tabs">
                                    <button
                                        className={`modal-tab-btn ${activeTab === "overview" ? "active" : ""}`}
                                        onClick={() => setActiveTab("overview")}
                                    >
                                        <FileText size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                                        Overview
                                    </button>
                                    <button
                                        className={`modal-tab-btn ${activeTab === "farmer" ? "active" : ""}`}
                                        onClick={() => setActiveTab("farmer")}
                                    >
                                        <User size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                                        Farmer & Aadhaar
                                    </button>
                                    <button
                                        className={`modal-tab-btn ${activeTab === "mandi" ? "active" : ""}`}
                                        onClick={() => setActiveTab("mandi")}
                                    >
                                        <Store size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                                        Mandi & Counter
                                    </button>
                                    <button
                                        className={`modal-tab-btn ${activeTab === "bank" ? "active" : ""}`}
                                        onClick={() => setActiveTab("bank")}
                                    >
                                        <CreditCard size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                                        Bank & Land
                                    </button>
                                    <button
                                        className={`modal-tab-btn ${activeTab === "proof" ? "active" : ""}`}
                                        onClick={() => setActiveTab("proof")}
                                    >
                                        <Receipt size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                                        Payment Proof {proof ? "✓" : ""}
                                    </button>
                                    <button
                                        className={`modal-tab-btn ${activeTab === "audit" ? "active" : ""}`}
                                        onClick={() => setActiveTab("audit")}
                                    >
                                        <History size={15} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                                        Audit Trail ({auditLogs.length})
                                    </button>
                                </div>

                                {/* TAB 1: OVERVIEW */}
                                {activeTab === "overview" && (
                                    <div>
                                        <div className="detail-grid">
                                            <div className="detail-item">
                                                <div className="detail-item-label">Total Payable Amount</div>
                                                <div className="detail-item-value" style={{ fontSize: "18px", color: "var(--primary-700)" }}>
                                                    ₹{Number(p.total_payable_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Quantity Sold</div>
                                                <div className="detail-item-value">{Number(p.quantity_sold).toFixed(2)} Quintals</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Rate Per Quintal (MSP)</div>
                                                <div className="detail-item-value">₹{Number(p.rate_per_unit).toFixed(2)}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Crop Name</div>
                                                <div className="detail-item-value">{paymentData.crop?.crop_name} ({paymentData.crop?.crop_type || "Standard"})</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Procurement Mandi</div>
                                                <div className="detail-item-value">{m?.mandi_name} (ID: #{m?.mandi_id})</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Farmer Beneficiary</div>
                                                <div className="detail-item-value">{f?.name} (ID: #{f?.farmer_id})</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Creation Timestamp</div>
                                                <div className="detail-item-value">{new Date(p.created_at).toLocaleString("en-IN")}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Payment Disbursal Date</div>
                                                <div className="detail-item-value">{p.payment_date ? new Date(p.payment_date).toLocaleString("en-IN") : "Not Disbursed"}</div>
                                            </div>
                                            {proof?.transaction_reference && (
                                                <div className="detail-item">
                                                    <div className="detail-item-label">Bank UTR Reference</div>
                                                    <div className="detail-item-value" style={{ fontFamily: "monospace", color: "#1e40af" }}>
                                                        {proof.transaction_reference}
                                                    </div>
                                                </div>
                                            )}
                                            {cu && (
                                                <div className="detail-item">
                                                    <div className="detail-item-label">Procured By (Counter Operator)</div>
                                                    <div className="detail-item-value"><strong>{cu.name}</strong> (Counter #{cu.counter_number})</div>
                                                </div>
                                            )}
                                        </div>

                                        {proof?.screenshot && (
                                            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 14px", borderRadius: "8px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534", fontWeight: 600 }}>
                                                    <CheckCircle2 size={16} />
                                                    <span>Verified completion screenshot is attached to this payment record.</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ gap: "4px", fontSize: "12px" }}
                                                    onClick={() => setActiveTab("proof")}
                                                >
                                                    <Receipt size={13} />
                                                    <span>View Proof</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: FARMER & AADHAAR */}
                                {activeTab === "farmer" && (
                                    <div>
                                        {/* Authorized Aadhaar Banner */}
                                        <div className="detail-grid">
                                            <div className="detail-item">
                                                <div className="detail-item-label">Full Name</div>
                                                <div className="detail-item-value">{f?.name}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Mobile Number</div>
                                                <div className="detail-item-value">📱 {f?.mobile_number}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Email Address</div>
                                                <div className="detail-item-value">{f?.email || "—"}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">State</div>
                                                <div className="detail-item-value">{f?.state_name}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">District</div>
                                                <div className="detail-item-value">{f?.district_name || "—"}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Tehsil</div>
                                                <div className="detail-item-value">{f?.tehsil_name || "—"}</div>
                                            </div>
                                            <div className="detail-item" style={{ gridColumn: "span 2" }}>
                                                <div className="detail-item-label">Residential Address</div>
                                                <div className="detail-item-value">{f?.address || "—"}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Registration Date</div>
                                                <div className="detail-item-value">{new Date(f?.registration_date).toLocaleDateString("en-IN")}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Portal Account Status</div>
                                                <div className="detail-item-value" style={{ textTransform: "capitalize" }}>{f?.status}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: MANDI & COUNTER */}
                                {activeTab === "mandi" && (
                                    <div>
                                        <div className="detail-grid">
                                            <div className="detail-item">
                                                <div className="detail-item-label">Mandi Name</div>
                                                <div className="detail-item-value">{m?.mandi_name}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Mandi State</div>
                                                <div className="detail-item-value">{m?.state_name}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Mandi District</div>
                                                <div className="detail-item-value">{m?.district_name}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Mandi Tehsil</div>
                                                <div className="detail-item-value">{m?.tehsil_name}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Daily Capacity</div>
                                                <div className="detail-item-value">{m?.capacity ? `${m.capacity} Qtl` : "N/A"}</div>
                                            </div>
                                        </div>

                                        <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--gray-900)", marginTop: "20px", marginBottom: "12px" }}>
                                            Counter & Booking Details
                                        </h4>

                                        <div className="detail-grid">
                                            <div className="detail-item">
                                                <div className="detail-item-label">Counter Name & Number</div>
                                                <div className="detail-item-value">{c ? `${c.counter_name} (#${c.counter_number})` : "Counter Unassigned"}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Counter Supported Crop</div>
                                                <div className="detail-item-value">{c?.supported_crop || "Standard"}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Booking Time / Slot</div>
                                                <div className="detail-item-value">{bk?.booking_time ? new Date(bk.booking_time).toLocaleString("en-IN") : "—"}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Approved Quantity</div>
                                                <div className="detail-item-value">{bk?.quantity_approved ? `${Number(bk.quantity_approved).toFixed(2)} Qtl` : "—"}</div>
                                            </div>
                                            <div className="detail-item">
                                                <div className="detail-item-label">Queue Token</div>
                                                <div className="detail-item-value">{tk ? `Token #${tk.token_number} (${tk.status})` : "Token Not Issued"}</div>
                                            </div>
                                        </div>

                                        {cu && (
                                            <div style={{ marginTop: "20px" }}>
                                                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--gray-900)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <User size={16} color="var(--primary-600)" />
                                                    Generating Counter User Details
                                                </h4>
                                                <div className="detail-grid">
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Counter User ID & Name</div>
                                                        <div className="detail-item-value">
                                                            <strong>{cu.name}</strong> (ID: #{cu.user_id})
                                                        </div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Registered Phone Number</div>
                                                        <div className="detail-item-value">{cu.phone_number ? `+91 ${cu.phone_number}` : "N/A"}</div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Official Email</div>
                                                        <div className="detail-item-value">{cu.email || "N/A"}</div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Operating Counter</div>
                                                        <div className="detail-item-value">Counter {cu.counter_number} - {cu.counter_name}</div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Mandi & Location</div>
                                                        <div className="detail-item-value">{cu.mandi_name} ({cu.mandi_location || "Mandi Yard"})</div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Operational Address</div>
                                                        <div className="detail-item-value">{cu.address || "N/A"}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 4: BANK & LAND */}
                                {activeTab === "bank" && (
                                    <div>
                                        {/* Bank Account */}
                                        <div style={{ marginBottom: "24px" }}>
                                            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--gray-900)", marginBottom: "12px" }}>
                                                Disbursal Bank Account Details
                                            </h4>
                                            {b ? (
                                                <div className="detail-grid">
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Bank Name</div>
                                                        <div className="detail-item-value">{b.bank_name}</div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Account Number</div>
                                                        <div className="detail-item-value" style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}>
                                                            {b.account_number}
                                                        </div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">IFSC Code</div>
                                                        <div className="detail-item-value" style={{ fontFamily: "monospace" }}>{b.ifsc_code}</div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Account Verification Status</div>
                                                        <div className="detail-item-value" style={{
                                                            color: b.verification_status === "verified" ? "#16a34a" : "#dc2626",
                                                            textTransform: "capitalize"
                                                        }}>
                                                            {b.verification_status}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="alert alert-info">No bank account registered for this farmer.</div>
                                            )}
                                        </div>

                                        {/* Land Holdings */}
                                        <div>
                                            <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--gray-900)", marginBottom: "12px" }}>
                                                Verified Land Records ({lands.length})
                                            </h4>
                                            {lands.length > 0 ? (
                                                <div className="table-responsive">
                                                    <table className="data-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Land ID</th>
                                                                <th>Area (Acres)</th>
                                                                <th>Ownership</th>
                                                                <th>Land Type</th>
                                                                <th>Verification</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {lands.map((l) => (
                                                                <tr key={l.land_id}>
                                                                    <td>#{l.land_id}</td>
                                                                    <td>{Number(l.area).toFixed(2)}</td>
                                                                    <td style={{ textTransform: "capitalize" }}>{l.ownership_type}</td>
                                                                    <td style={{ textTransform: "capitalize" }}>{l.land_type}</td>
                                                                    <td>
                                                                        <span style={{
                                                                            color: l.land_verification === "verified" ? "#16a34a" : "#d97706",
                                                                            fontWeight: 600,
                                                                            textTransform: "capitalize"
                                                                        }}>
                                                                            {l.land_verification}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="alert alert-info">No land records attached to this farmer.</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 5: PAYMENT PROOF (SCREENSHOT & UTR) */}
                                {activeTab === "proof" && (
                                    <div>
                                        {proof ? (
                                            <div>
                                                <div style={{
                                                    backgroundColor: "#f0fdf4",
                                                    border: "1px solid #bbf7d0",
                                                    borderRadius: "8px",
                                                    padding: "12px 16px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    marginBottom: "16px"
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#15803d", fontWeight: 600 }}>
                                                        <ShieldCheck size={20} />
                                                        <span>Disbursal Execution Confirmed & Stored in SQL Audit Database</span>
                                                    </div>
                                                    <span style={{ fontSize: "12px", color: "#166534" }}>
                                                        Proof ID: #{proof.proof_id}
                                                    </span>
                                                </div>

                                                <div className="detail-grid">
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Bank UTR / Transaction Reference</div>
                                                        <div className="detail-item-value" style={{ fontFamily: "monospace", color: "#1e40af", fontSize: "14px" }}>
                                                            {proof.transaction_reference || "N/A (Standard RTGS/NEFT)"}
                                                        </div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Disbursal Completion Timestamp</div>
                                                        <div className="detail-item-value">
                                                            {proof.completion_date ? new Date(proof.completion_date).toLocaleString("en-IN") : "—"}
                                                        </div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Verified By Operator</div>
                                                        <div className="detail-item-value">
                                                            Payment Officer #{proof.operator_id}
                                                        </div>
                                                    </div>
                                                    <div className="detail-item">
                                                        <div className="detail-item-label">Payment Notes</div>
                                                        <div className="detail-item-value">
                                                            {proof.notes || "None provided"}
                                                        </div>
                                                    </div>
                                                </div>

                                                {proof.screenshot && (
                                                    <div className="screenshot-proof-card">
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                                                            <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--gray-800)" }}>
                                                                Disbursal Screenshot / Bank Receipt
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary btn-sm"
                                                                style={{ gap: "4px", fontSize: "12px" }}
                                                                onClick={() => setEnlargedImage(true)}
                                                            >
                                                                <ZoomIn size={14} />
                                                                <span>Enlarge Screenshot</span>
                                                            </button>
                                                        </div>

                                                        <div style={{ textAlign: "center", background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                                                            <img
                                                                src={proof.screenshot}
                                                                alt="Disbursal Proof"
                                                                className="screenshot-proof-img"
                                                                onClick={() => setEnlargedImage(true)}
                                                                title="Click to view full size"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="empty-state">
                                                <Receipt size={40} className="empty-state-icon" />
                                                <div className="empty-state-title">No Completion Proof Attached</div>
                                                <p style={{ fontSize: "13px", color: "var(--gray-500)", marginTop: "4px" }}>
                                                    {p?.payment_status === "PAID"
                                                        ? "This payment was marked paid prior to screenshot verification enforcement."
                                                        : "Completion proof and bank receipt are captured when the payment is transitioned to PAID status."}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 6: AUDIT TRAIL */}
                                {activeTab === "audit" && (
                                    <div>
                                        {auditLogs.length > 0 ? (
                                            <div className="table-responsive">
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Timestamp</th>
                                                            <th>Operator</th>
                                                            <th>Action</th>
                                                            <th>Transition</th>
                                                            <th>Outcome</th>
                                                            <th>Reason / Notes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {auditLogs.map((log, idx) => (
                                                            <tr key={idx}>
                                                                <td>{new Date(log.timestamp).toLocaleString("en-IN")}</td>
                                                                <td>{log.operator_username} (ID: #{log.operator_id})</td>
                                                                <td>
                                                                    <strong style={{ fontSize: "12px" }}>{log.action}</strong>
                                                                </td>
                                                                <td>
                                                                    {log.previous_status && log.new_status ? (
                                                                        <span style={{ fontSize: "12px" }}>
                                                                            {log.previous_status} → <strong>{log.new_status}</strong>
                                                                        </span>
                                                                    ) : "—"}
                                                                </td>
                                                                <td>
                                                                    <span style={{
                                                                        color: log.outcome === "SUCCESS" ? "#16a34a" : "#dc2626",
                                                                        fontWeight: 600
                                                                    }}>
                                                                        {log.outcome}
                                                                    </span>
                                                                </td>
                                                                <td style={{ fontSize: "12px", color: "var(--gray-600)" }}>
                                                                    {log.reason || "—"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="empty-state">
                                                <div className="empty-state-title">No Audit Logs Recorded Yet</div>
                                                <p>All lifecycle transitions and verification events will be logged here.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Enlarged Screenshot Modal */}
            {enlargedImage && proof?.screenshot && (
                <div
                    className="modal-overlay"
                    style={{ zIndex: 1100, backgroundColor: "rgba(0, 0, 0, 0.85)" }}
                    onClick={() => setEnlargedImage(false)}
                >
                    <div
                        style={{
                            position: "relative",
                            maxWidth: "92vw",
                            maxHeight: "92vh",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="btn btn-secondary btn-sm"
                            style={{
                                position: "absolute",
                                top: "-40px",
                                right: "0",
                                backgroundColor: "#ffffff",
                                borderRadius: "50%",
                                width: "32px",
                                height: "32px",
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                            onClick={() => setEnlargedImage(false)}
                        >
                            <X size={18} />
                        </button>
                        <img
                            src={proof.screenshot}
                            alt="Full size proof"
                            style={{
                                maxWidth: "100%",
                                maxHeight: "85vh",
                                objectFit: "contain",
                                borderRadius: "8px",
                                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
