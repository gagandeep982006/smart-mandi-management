import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

let toastCounter = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = "info", duration = 4000) => {
        const id = ++toastCounter;
        const newToast = { id, message, type };
        setToasts((prev) => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const toast = {
        success: (msg, duration) => addToast(msg, "success", duration),
        error: (msg, duration) => addToast(msg, "error", duration),
        info: (msg, duration) => addToast(msg, "info", duration),
        warning: (msg, duration) => addToast(msg, "warning", duration)
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container" aria-live="polite">
                {toasts.map((t) => {
                    let Icon = Info;
                    let iconColor = "#0284c7";
                    if (t.type === "success") {
                        Icon = CheckCircle2;
                        iconColor = "#059669";
                    } else if (t.type === "error") {
                        Icon = AlertCircle;
                        iconColor = "#dc2626";
                    } else if (t.type === "warning") {
                        Icon = AlertTriangle;
                        iconColor = "#d97706";
                    }

                    return (
                        <div key={t.id} className={`toast-item toast-${t.type}`}>
                            <Icon size={18} color={iconColor} style={{ flexShrink: 0, marginTop: "2px" }} />
                            <div className="toast-message">{t.message}</div>
                            <button
                                type="button"
                                className="toast-close-btn"
                                onClick={() => removeToast(t.id)}
                                aria-label="Close notification"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};
