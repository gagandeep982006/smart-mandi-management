import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmVariant = "primary",
    requireReason = false,
    reasonLabel = "Reason for this action",
    loading = false,
    onConfirm,
    onCancel
}) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (requireReason && !reason.trim()) {
            setError("Please provide a reason before proceeding");
            return;
        }
        setError("");
        onConfirm(reason.trim());
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: "480px" }}>
                <div className="modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <AlertCircle size={20} color={confirmVariant === "danger" ? "#dc2626" : "#2563eb"} />
                        <h3 className="modal-title">{title}</h3>
                    </div>
                    <button className="modal-close-btn" onClick={onCancel} disabled={loading}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    <p style={{ color: "var(--gray-600)", marginBottom: requireReason ? "16px" : "0" }}>
                        {message}
                    </p>

                    {requireReason && (
                        <div className="form-group" style={{ marginTop: "12px" }}>
                            <label className="form-label">{reasonLabel} *</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder="Enter specific reason..."
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    if (error) setError("");
                                }}
                                disabled={loading}
                            />
                            {error && (
                                <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block" }}>
                                    {error}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                        {cancelText}
                    </button>
                    <button
                        className={`btn btn-${confirmVariant}`}
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? "Processing..." : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
