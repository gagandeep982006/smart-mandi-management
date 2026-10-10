import React from "react";
import { Eye, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Inbox } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import { useAuth } from "../../context/AuthContext";

export default function PaymentTable({
    payments,
    onViewDetails,
    onAction
}) {
    const { hasPermission } = useAuth();
    const canProcess = hasPermission("payment.process");
    const canUpdate = hasPermission("payment.update");

    if (!payments || payments.length === 0) {
        return (
            <div className="table-container">
                <div className="empty-state">
                    <Inbox size={42} className="empty-state-icon" />
                    <div className="empty-state-title">No Payment Records Found</div>
                    <p>There are no payments matching the specified status and filter criteria.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="table-container">
            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Payment ID</th>
                            <th>Date</th>
                            <th>Farmer Beneficiary</th>
                            <th>Location (District/Tehsil)</th>
                            <th>Crop</th>
                            <th>Quantity</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((p) => {
                            const status = p.payment_status;

                            return (
                                <tr key={p.payment_id}>
                                    <td>
                                        <strong>#{p.payment_id}</strong>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: "12px", color: "var(--gray-600)" }}>
                                            {p.payment_date 
                                                ? new Date(p.payment_date).toLocaleDateString("en-IN")
                                                : new Date(p.created_at).toLocaleDateString("en-IN")}
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{p.farmer_name}</div>
                                            <div style={{ fontSize: "11.5px", color: "var(--gray-500)" }}>📱 {p.farmer_mobile}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: "12.5px" }}>
                                            {p.farmer_district_name || "—"} / {p.farmer_tehsil_name || "—"}
                                        </div>
                                    </td>
                                    <td>{p.crop_name}</td>
                                    <td>
                                        <strong>{Number(p.quantity_sold).toFixed(2)}</strong> q
                                    </td>
                                    <td>
                                        <strong style={{ color: "var(--primary-700)" }}>
                                            ₹{Number(p.total_payable_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                        </strong>
                                    </td>
                                    <td>
                                        <StatusBadge status={status} />
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                                            {/* 1. View Details (Always available) */}
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => onViewDetails(p.payment_id)}
                                                title="View Full Payment & Mandi Details"
                                            >
                                                <Eye size={13} />
                                                <span>View</span>
                                            </button>

                                            {/* 2. Contextual Actions for PENDING */}
                                            {status === "PENDING" && (
                                                <>
                                                    {canProcess && (
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => onAction(p, "MARK_PROCESSING")}
                                                            title="Verify and move to processing"
                                                        >
                                                            <RefreshCw size={13} />
                                                            <span>Process</span>
                                                        </button>
                                                    )}
                                                    {canUpdate && (
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => onAction(p, "CANCEL")}
                                                            title="Cancel this payment"
                                                        >
                                                            <XCircle size={13} />
                                                            <span>Cancel</span>
                                                        </button>
                                                    )}
                                                </>
                                            )}

                                            {/* 3. Contextual Actions for PROCESSING */}
                                            {status === "PROCESSING" && canProcess && (
                                                <>
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => onAction(p, "MARK_PAID")}
                                                        title="Mark disbursal as completed/paid"
                                                    >
                                                        <CheckCircle2 size={13} />
                                                        <span>Mark Paid</span>
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => onAction(p, "MARK_FAILED")}
                                                        title="Mark disbursal as failed"
                                                    >
                                                        <AlertTriangle size={13} />
                                                        <span>Failed</span>
                                                    </button>
                                                </>
                                            )}

                                            {/* 4. Contextual Actions for CANCELLED */}
                                            {status === "CANCELLED" && (canUpdate || canProcess) && (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => onAction(p, "RESTORE")}
                                                    title="Restore eligible payment"
                                                >
                                                    <RefreshCw size={13} />
                                                    <span>Restore</span>
                                                </button>
                                            )}

                                            {/* 5. Contextual Actions for FAILED */}
                                            {status === "FAILED" && (canUpdate || canProcess) && (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => onAction(p, "RETRY")}
                                                    title="Retry payment disbursal"
                                                >
                                                    <RefreshCw size={13} />
                                                    <span>Retry</span>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
