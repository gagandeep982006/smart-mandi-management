const { getReadDatabase } = require("../services/databaserouter");
const { getRecentLogsForState } = require("../services/auditLogService");

/**
 * GET /api/dashboard/stats
 * Aggregates live payment metrics (counts and amounts) for the user's assigned state.
 */
async function getDashboardStats(req, res) {
    try {
        const stateId = req.user.state_id;
        const readDb = getReadDatabase().promise();

        // Single efficient aggregation query grouped by payment_status
        const [rows] = await readDb.query(
            `SELECT 
                p.payment_status,
                COUNT(*) AS total_count,
                COALESCE(SUM(p.total_payable_amount), 0) AS total_amount
             FROM payment p
             JOIN farmer f ON p.farmer_id = f.farmer_id
             WHERE f.state_id = ?
             GROUP BY p.payment_status`,
            [stateId]
        );

        // Format metrics map
        const statsMap = {
            PENDING: { count: 0, amount: 0 },
            PROCESSING: { count: 0, amount: 0 },
            PAID: { count: 0, amount: 0 },
            FAILED: { count: 0, amount: 0 },
            CANCELLED: { count: 0, amount: 0 }
        };

        let grandTotalCount = 0;
        let grandTotalAmount = 0;

        for (const row of rows) {
            const status = row.payment_status;
            if (statsMap[status]) {
                const count = Number(row.total_count) || 0;
                const amount = Number(row.total_amount) || 0;
                statsMap[status] = { count, amount };
                grandTotalCount += count;
                grandTotalAmount += amount;
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                state_id: stateId,
                state_name: req.user.state_name,
                pending: statsMap.PENDING,
                processing: statsMap.PROCESSING,
                paid: statsMap.PAID,
                failed: statsMap.FAILED,
                cancelled: statsMap.CANCELLED,
                total: {
                    count: grandTotalCount,
                    amount: grandTotalAmount
                }
            }
        });
    } catch (err) {
        console.error("[getDashboardStats Error]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to load dashboard metrics"
        });
    }
}

/**
 * GET /api/dashboard/recent-logs
 * Retrieves recent audit logs from MongoDB within the configured PAYMENT_RECENT_LOG_DAYS.
 */
async function getDashboardRecentLogs(req, res) {
    try {
        const stateId = req.user.state_id;
        const limit = Math.min(parseInt(req.query.limit, 10) || 15, 50);

        const logs = await getRecentLogsForState(stateId, limit);

        return res.status(200).json({
            success: true,
            data: logs
        });
    } catch (err) {
        console.error("[getDashboardRecentLogs Error]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to load recent activity logs"
        });
    }
}

module.exports = {
    getDashboardStats,
    getDashboardRecentLogs
};
