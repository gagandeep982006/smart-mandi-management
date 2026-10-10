import React from "react";
import { Clock, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default function StatusBadge({ status }) {
    const clean = String(status || "").toUpperCase();

    let className = "status-badge ";
    let icon = null;
    let label = clean;

    switch (clean) {
        case "PENDING":
            className += "status-pending";
            icon = <Clock size={12} />;
            label = "Pending";
            break;
        case "PROCESSING":
            className += "status-processing";
            icon = <RefreshCw size={12} />;
            label = "Processing";
            break;
        case "PAID":
            className += "status-paid";
            icon = <CheckCircle2 size={12} />;
            label = "Paid";
            break;
        case "CANCELLED":
            className += "status-cancelled";
            icon = <XCircle size={12} />;
            label = "Cancelled";
            break;
        case "FAILED":
            className += "status-failed";
            icon = <AlertTriangle size={12} />;
            label = "Failed";
            break;
        default:
            className += "status-cancelled";
            label = clean || "Unknown";
    }

    return (
        <span className={className}>
            {icon}
            {label}
        </span>
    );
}
