const PaymentLog = require("../models/PaymentLog");

/**
 * Record an audit log entry in MongoDB
 * Never logs passwords, tokens, full Aadhaar or sensitive bank keys.
 */
async function recordAuditLog(data) {
    try {
        const logEntry = new PaymentLog({
            payment_id: data.payment_id || null,
            state_id: Number(data.state_id),
            operator_id: Number(data.operator_id),
            operator_username: String(data.operator_username || "system"),
            action: data.action,
            previous_status: data.previous_status || null,
            new_status: data.new_status || null,
            amount: data.amount !== undefined && data.amount !== null ? Number(data.amount) : null,
            outcome: data.outcome || "SUCCESS",
            reason: data.reason ? String(data.reason).substring(0, 500) : null,
            ip_address: data.ip_address || null,
            timestamp: data.timestamp || new Date()
        });

        await logEntry.save();
        return logEntry;
    } catch (err) {
        console.error("[Audit Log Error] Failed to write audit log:", err.message);
        // Do not throw so that main payment transaction is not aborted due to a logging glitch
        return null;
    }
}

/**
 * Fetch recent audit logs for a given state within the configured days
 */
async function getRecentLogsForState(stateId, limit = 20) {
    try {
        const recentDays = parseInt(process.env.PAYMENT_RECENT_LOG_DAYS, 10) || 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - recentDays);

        const logs = await PaymentLog.find({
            state_id: Number(stateId),
            timestamp: { $gte: cutoffDate }
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        return logs;
    } catch (err) {
        console.error("[Audit Log Error] Failed to query recent logs:", err.message);
        return [];
    }
}

/**
 * Fetch audit logs for a specific payment
 */
async function getLogsForPayment(paymentId) {
    try {
        const logs = await PaymentLog.find({ payment_id: Number(paymentId) })
            .sort({ timestamp: -1 })
            .lean();
        return logs;
    } catch (err) {
        console.error("[Audit Log Error] Failed to query payment logs:", err.message);
        return [];
    }
}

module.exports = {
    recordAuditLog,
    getRecentLogsForState,
    getLogsForPayment
};
