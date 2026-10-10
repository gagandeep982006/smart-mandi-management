import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

export default function ConfirmModal({
    isOpen,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    details = null,
    confirmText = "Confirm",
    confirmVariant = "primary", // "primary" | "danger" | "success" | "warning"
    onConfirm,
    onCancel,
    loading = false,
    children
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen && !loading) {
                onCancel();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, loading, onCancel]);

    if (!isOpen) return null;

    let Icon = Info;
    let iconColor = "var(--primary)";
    let confirmBtnClass = "btn btn-primary";

    if (confirmVariant === "danger") {
        Icon = AlertTriangle;
        iconColor = "var(--danger)";
        confirmBtnClass = "btn btn-danger";
    } else if (confirmVariant === "success") {
        Icon = CheckCircle;
        iconColor = "var(--success)";
        confirmBtnClass = "btn btn-success";
    } else if (confirmVariant === "warning") {
        Icon = AlertTriangle;
        iconColor = "var(--warning)";
        confirmBtnClass = "btn btn-warning";
    }

    return (
        <div className="modal-overlay" onClick={() => !loading && onCancel()}>
            <div 
                className="modal-content" 
                style={{ maxWidth: "460px" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Icon size={20} color={iconColor} />
                        <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 600 }}>{title}</h3>
                    </div>
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body">
                    <p style={{ fontSize: "0.95rem", color: "var(--text-main)", marginBottom: details ? "14px" : "0", lineHeight: 1.5 }}>
                        {message}
                    </p>

                    {details && (
                        <div style={{
                            background: "var(--bg-main)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            padding: "12px",
                            fontSize: "0.85rem"
                        }}>
                            {Object.entries(details).map(([key, value]) => (
                                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                                    <span style={{ color: "var(--text-muted)" }}>{key}:</span>
                                    <strong>{value}</strong>
                                </div>
                            ))}
                        </div>
                    )}

                    {children}
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={`${confirmBtnClass} btn-sm`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border-sm" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
