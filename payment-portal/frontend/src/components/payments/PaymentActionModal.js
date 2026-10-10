import React, { useState } from "react";
import {
    AlertCircle,
    X,
    CheckCircle,
    RefreshCw,
    XCircle,
    AlertTriangle,
    UploadCloud,
    Trash2
} from "lucide-react";
import { apiRequest } from "../../api/client";

export default function PaymentActionModal({
    isOpen,
    payment,
    actionType, // 'MARK_PROCESSING', 'CANCEL', 'MARK_PAID', 'MARK_FAILED', 'RESTORE', 'RETRY'
    onClose,
    onSuccess
}) {
    const [targetStatus, setTargetStatus] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Proof of Payment fields (for MARK_PAID)
    const [screenshot, setScreenshot] = useState("");
    const [screenshotFileName, setScreenshotFileName] = useState("");
    const [screenshotFileSize, setScreenshotFileSize] = useState("");
    const [transactionReference, setTransactionReference] = useState("");
    const [notes, setNotes] = useState("");
    const [dragActive, setDragActive] = useState(false);

    if (!isOpen || !payment) return null;

    let title = "";
    let description = "";
    let defaultTarget = "";
    let reasonRequired = false;
    let confirmBtnText = "Confirm";
    let confirmVariant = "primary";
    let icon = null;

    switch (actionType) {
        case "MARK_PROCESSING":
            title = "Move Payment to Processing";
            description = `Verify payment #${payment.payment_id} for farmer ${payment.farmer_name} (₹${Number(payment.total_payable_amount).toLocaleString("en-IN")}) and mark as actively processing.`;
            defaultTarget = "PROCESSING";
            reasonRequired = false;
            confirmBtnText = "Start Processing";
            confirmVariant = "primary";
            icon = <RefreshCw size={20} color="#2563eb" />;
            break;

        case "CANCEL":
            title = "Cancel Payment Disbursal";
            description = `Are you sure you want to cancel payment #${payment.payment_id}? A valid administrative justification is required.`;
            defaultTarget = "CANCELLED";
            reasonRequired = true;
            confirmBtnText = "Cancel Payment";
            confirmVariant = "danger";
            icon = <XCircle size={20} color="#dc2626" />;
            break;

        case "MARK_PAID":
            title = "Confirm Payment Disbursal (Mark Paid)";
            description = `Confirm that payment #${payment.payment_id} of ₹${Number(payment.total_payable_amount).toLocaleString("en-IN")} has been verified and disbursed to farmer ${payment.farmer_name}. Uploading the completion screenshot/receipt is required.`;
            defaultTarget = "PAID";
            reasonRequired = false;
            confirmBtnText = "Mark as Paid";
            confirmVariant = "success";
            icon = <CheckCircle size={20} color="#16a34a" />;
            break;

        case "MARK_FAILED":
            title = "Mark Payment as Failed";
            description = `Mark payment #${payment.payment_id} as FAILED due to bank rejection, account error, or operational failure. Reason is required.`;
            defaultTarget = "FAILED";
            reasonRequired = true;
            confirmBtnText = "Mark Failed";
            confirmVariant = "danger";
            icon = <AlertTriangle size={20} color="#dc2626" />;
            break;

        case "RESTORE":
            title = "Restore Cancelled Payment";
            description = `Restore previously cancelled payment #${payment.payment_id} to an active queue state. Specify target status and reason.`;
            defaultTarget = "PENDING";
            reasonRequired = true;
            confirmBtnText = "Restore Payment";
            confirmVariant = "primary";
            icon = <RefreshCw size={20} color="#2563eb" />;
            break;

        case "RETRY":
            title = "Retry Failed Payment";
            description = `Retry failed payment #${payment.payment_id} by moving it back to PENDING or directly to PROCESSING for re-execution. Reason is required.`;
            defaultTarget = "PENDING";
            reasonRequired = true;
            confirmBtnText = "Retry Payment";
            confirmVariant = "primary";
            icon = <RefreshCw size={20} color="#2563eb" />;
            break;

        default:
            return null;
    }

    const currentTarget = targetStatus || defaultTarget;

    const handleFileChange = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Please upload an image file (PNG, JPG, JPEG, WEBP).");
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            setError("Image file size must be less than 20MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setScreenshot(e.target.result);
            setScreenshotFileName(file.name);
            setScreenshotFileSize((file.size / 1024).toFixed(1) + " KB");
            if (error) setError("");
        };
        reader.onerror = () => {
            setError("Failed to read image file. Please try again.");
        };
        reader.readAsDataURL(file);
    };

    const handleCloseModal = () => {
        setScreenshot("");
        setScreenshotFileName("");
        setScreenshotFileSize("");
        setTransactionReference("");
        setNotes("");
        setReason("");
        setError("");
        setTargetStatus("");
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (reasonRequired && !reason.trim()) {
            setError("A descriptive reason is required to complete this action.");
            return;
        }

        if (currentTarget === "PAID") {
            if (!screenshot) {
                setError("Payment completion screenshot is mandatory.");
                return;
            }
            if (!transactionReference.trim()) {
                setError("Bank UTR / Transaction reference number is mandatory.");
                return;
            }
            if (!notes.trim()) {
                setError("Payment disbursal notes / remarks are mandatory.");
                return;
            }
        }

        setLoading(true);
        setError("");

        try {
            const payload = {
                target_status: currentTarget,
                reason: reason.trim()
            };

            if (currentTarget === "PAID") {
                payload.screenshot = screenshot;
                payload.transaction_reference = transactionReference.trim();
                payload.notes = notes.trim();
            }

            const res = await apiRequest(`/payments/${payment.payment_id}/transition`, {
                method: "POST",
                body: payload
            });

            if (res.success) {
                onSuccess(res.message || "Status updated successfully");
                handleCloseModal();
            } else {
                setError(res.message || "Failed to update payment status");
            }
        } catch (err) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div
                className="modal-container"
                style={{
                    maxWidth: actionType === "MARK_PAID" ? "560px" : "520px",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column"
                }}
            >
                <div className="modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {icon}
                        <h3 className="modal-title">{title}</h3>
                    </div>
                    <button className="modal-close-btn" onClick={handleCloseModal} disabled={loading}>
                        <X size={18} />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="modal-form"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        minHeight: 0,
                        overflow: "hidden"
                    }}
                >
                    <div
                        className="modal-body"
                        style={{
                            overflowY: "auto",
                            flex: 1,
                            minHeight: 0
                        }}
                    >
                        {error && (
                            <div className="alert alert-danger" style={{ marginBottom: "14px" }}>
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <p style={{ color: "var(--gray-700)", marginBottom: "16px", fontSize: "13.5px" }}>
                            {description}
                        </p>

                        {/* Destination state picker for Restore & Retry */}
                        {(actionType === "RESTORE" || actionType === "RETRY") && (
                            <div className="form-group">
                                <label className="form-label">Destination Queue State *</label>
                                <select
                                    className="form-control"
                                    value={currentTarget}
                                    onChange={(e) => setTargetStatus(e.target.value)}
                                    disabled={loading}
                                >
                                    <option value="PENDING">PENDING (Review & Verify)</option>
                                    <option value="PROCESSING">PROCESSING (Immediate Re-processing)</option>
                                </select>
                            </div>
                        )}

                        {/* Reason Input */}
                        {reasonRequired && (
                            <div className="form-group">
                                <label className="form-label">
                                    Administrative Justification / Reason *
                                </label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    placeholder="Provide detailed explanation for this transition..."
                                    value={reason}
                                    onChange={(e) => {
                                        setReason(e.target.value);
                                        if (error) setError("");
                                    }}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        )}

                        {/* Screenshot & Reference Inputs for MARK_PAID */}
                        {actionType === "MARK_PAID" && (
                            <>
                                <div className="form-group" style={{ marginBottom: "16px" }}>
                                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>Payment Screenshot / Receipt Slip *</span>
                                        <span style={{ fontSize: "11px", color: "var(--danger-600)", fontWeight: 600 }}>Required</span>
                                    </label>
                                    
                                    {!screenshot ? (
                                        <div
                                            className={`screenshot-upload-zone ${dragActive ? "dragover" : ""}`}
                                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                            onDragLeave={() => setDragActive(false)}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                setDragActive(false);
                                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                                    handleFileChange(e.dataTransfer.files[0]);
                                                }
                                            }}
                                            onClick={() => document.getElementById("proof-screenshot-input")?.click()}
                                        >
                                            <UploadCloud size={34} color="#2563eb" />
                                            <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--gray-800)" }}>
                                                Click to upload or drag & drop payment screenshot
                                            </div>
                                            <div style={{ fontSize: "11.5px", color: "var(--gray-500)" }}>
                                                PNG, JPG, JPEG, WEBP (Bank UTR screenshot or transfer receipt)
                                            </div>
                                            <input
                                                id="proof-screenshot-input"
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleFileChange(e.target.files[0]);
                                                    }
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="screenshot-preview-container">
                                            <img
                                                src={screenshot}
                                                alt="Payment Completion Slip"
                                                className="screenshot-preview-img"
                                            />
                                            <div className="screenshot-meta">
                                                <div>
                                                    <span style={{ fontWeight: 600 }}>{screenshotFileName}</span>
                                                    <span style={{ marginLeft: "8px", color: "var(--gray-500)" }}>({screenshotFileSize})</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ gap: "4px", color: "var(--danger-600)", padding: "4px 8px" }}
                                                    onClick={() => {
                                                        setScreenshot("");
                                                        setScreenshotFileName("");
                                                        setScreenshotFileSize("");
                                                    }}
                                                >
                                                    <Trash2 size={13} />
                                                    <span>Remove</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group" style={{ marginBottom: "14px" }}>
                                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>Bank UTR / Transaction Reference *</span>
                                        <span style={{ fontSize: "11px", color: "var(--danger-600)", fontWeight: 600 }}>Required</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. UTR240981928392 or IMPS/NEFT Ref"
                                        value={transactionReference}
                                        onChange={(e) => {
                                            setTransactionReference(e.target.value);
                                            if (error) setError("");
                                        }}
                                        disabled={loading}
                                        required
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: "14px" }}>
                                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>Disbursal Notes / Remarks *</span>
                                        <span style={{ fontSize: "11px", color: "var(--danger-600)", fontWeight: 600 }}>Required</span>
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        placeholder="Enter mandatory bank confirmation notes, transfer mode, etc."
                                        value={notes}
                                        onChange={(e) => {
                                            setNotes(e.target.value);
                                            if (error) setError("");
                                        }}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-footer" style={{ flexShrink: 0 }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCloseModal}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`btn btn-${confirmVariant}`}
                            disabled={loading}
                        >
                            {loading ? "Executing..." : confirmBtnText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
