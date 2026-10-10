const BookingHistory = require("../model/mongomodel/BookingHistory");
const TokenHistory = require("../model/mongomodel/TokenHistory");
const PaymentHistory = require("../model/mongomodel/PaymentHistory");
const MandiRecentLogs = require("../model/mongomodel/MandiRecentLogs");

async function runHistoryCleanup() {
    try {
        const transactionRetentionDays = parseInt(process.env.TRANSACTION_HISTORY_RETENTION_DAYS || process.env.DELETED_DATA_RETENTION_DAYS || "30", 10) || 30;
        const recentLogRetentionDays = parseInt(process.env.RECENT_LOG_RETENTION_DAYS || "7", 10) || 7;

        const historyCutoff = new Date();
        historyCutoff.setDate(historyCutoff.getDate() - transactionRetentionDays);

        const logsCutoff = new Date();
        logsCutoff.setDate(logsCutoff.getDate() - recentLogRetentionDays);

        // Delete MongoDB operational history older than TRANSACTION_HISTORY_RETENTION_DAYS
        // History records in BookingHistory, TokenHistory, and PaymentHistory are pruned past retention window.
        // Active bookings, active queue tokens, and current operational data remain completely untouched.
        const bookingRes = await BookingHistory.deleteMany({ archived_at: { $lt: historyCutoff } });
        const tokenRes = await TokenHistory.deleteMany({ archived_at: { $lt: historyCutoff } });
        const paymentRes = await PaymentHistory.deleteMany({ archived_at: { $lt: historyCutoff } });

        // Delete MandiRecentLogs older than RECENT_LOG_RETENTION_DAYS
        const recentLogsRes = await MandiRecentLogs.deleteMany({ navigate_at: { $lt: logsCutoff } });

        const totalDeleted = (bookingRes.deletedCount || 0) + 
                             (tokenRes.deletedCount || 0) + 
                             (paymentRes.deletedCount || 0) + 
                             (recentLogsRes.deletedCount || 0);

        if (totalDeleted > 0) {
            console.log(`[HistoryCleanup] Completed periodic cleanup:`);
            console.log(`  BookingHistory deleted (${transactionRetentionDays}d retention): ${bookingRes.deletedCount || 0}`);
            console.log(`  TokenHistory deleted (${transactionRetentionDays}d retention): ${tokenRes.deletedCount || 0}`);
            console.log(`  PaymentHistory deleted (${transactionRetentionDays}d retention): ${paymentRes.deletedCount || 0}`);
            console.log(`  MandiRecentLogs deleted (${recentLogRetentionDays}d retention): ${recentLogsRes.deletedCount || 0}`);
        }
    } catch (error) {
        console.error("[HistoryCleanup] Error during history cleanup execution:", error.message);
    }
}

/**
 * Initializes history cleanup: runs immediately at startup, then every intervalMs
 */
function initHistoryCleanupScheduler(intervalMs = 60 * 60 * 1000) {
    // Run once at startup
    runHistoryCleanup();

    // Run periodically (default every 1 hour)
    const timer = setInterval(() => {
        runHistoryCleanup();
    }, intervalMs);

    // Unref timer so it doesn't prevent graceful process exit
    if (timer.unref) {
        timer.unref();
    }

    return timer;
}

module.exports = {
    runHistoryCleanup,
    initHistoryCleanupScheduler
};
