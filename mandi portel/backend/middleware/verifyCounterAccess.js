const { getReadDatabase } = require("../services/databaserouter");

const verifyCounterAccess = (options = { requireActive: false }) => {
    return async (req, res, next) => {
        try {
            const counterId = Number(req.params.counter_id || req.body.counter_id || req.query.counter_id);

            if (!counterId || isNaN(counterId)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid counter_id is required"
                });
            }

            const user = req.user;
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "User not authenticated"
                });
            }

            // 1. Check if user is assigned to this counter
            const assignedCounters = Array.isArray(user.counter_ids) ? user.counter_ids : [];
            if (!assignedCounters.includes(counterId)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied: You are not assigned to this counter."
                });
            }

            // 2. Query counter from Read DB
            const readDb = getReadDatabase().promise();
            const [counters] = await readDb.query(
                `SELECT counter_id, mandi_id, counter_number, counter_name, crop_id, capacity_per_day, status
                 FROM mandi_counter
                 WHERE counter_id = ?`,
                [counterId]
            );

            if (counters.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Counter not found"
                });
            }

            const counter = counters[0];

            // 3. Verify counter belongs to user's mandi_id
            if (Number(counter.mandi_id) !== Number(user.mandi_id)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied: Counter belongs to a different Mandi."
                });
            }

            // 4. Verify counter is active when an operational action is requested
            if (options.requireActive && counter.status !== "active") {
                return res.status(403).json({
                    success: false,
                    message: "Counter is inactive. Operational queue actions are disabled."
                });
            }

            req.counter = counter;
            next();
        } catch (error) {
            console.error("verifyCounterAccess middleware error:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    };
};

module.exports = verifyCounterAccess;
