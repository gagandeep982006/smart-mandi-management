const { getReadDatabase, getWriteDatabase } = require("../services/databaserouter");
const MandiRecentLogs = require("../model/mongomodel/MandiRecentLogs");

const getMandiMe = async (req, res) => {
    try {
        const readDb = getReadDatabase().promise();
        const mandiId = req.user.mandi_id;

        // Fetch Mandi details including capacity and regional jurisdiction
        const [mandis] = await readDb.query(
            `SELECT mandi_id, mandi_name, tehsil_id, tehsil_name, district_id, district_name, state_id, state_name, capacity, created_at
             FROM vw_mandis
             WHERE mandi_id = ?`,
            [mandiId]
        );

        if (mandis.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi not found"
            });
        }

        // Fetch user profile and role from mandi_users
        const [users] = await readDb.query(
            `SELECT user_id, username, role, mandi_id, status, created_at
             FROM mandi_users
             WHERE user_id = ?`,
            [req.user.user_id]
        );

        const userProfile = users.length > 0 ? users[0] : null;

        return res.status(200).json({
            success: true,
            data: {
                mandi: mandis[0],
                user: {
                    user_id: req.user.user_id,
                    username: userProfile?.username || "Operator",
                    role: userProfile?.role || "mandi_user",
                    permissions: req.user.permissions,
                    mandi_id: req.user.mandi_id,
                    counter_ids: req.user.counter_ids
                }
            }
        });
    } catch (error) {
        console.error("getMandiMe error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getMandiTiming = async (req, res) => {
    try {
        const readDb = getReadDatabase().promise();
        const writeDb = getWriteDatabase().promise();

        // 1. Check if pending timing reached its effective date, promote if so
        await writeDb.query(
            `UPDATE mandi_timing
             SET opening_time = pending_opening_time,
                 closing_time = pending_closing_time,
                 pending_opening_time = NULL,
                 pending_closing_time = NULL,
                 effective_date = NULL
             WHERE mandi_id = ? 
               AND effective_date IS NOT NULL 
               AND effective_date <= CURDATE() 
               AND pending_opening_time IS NOT NULL`,
            [req.user.mandi_id]
        );

        const [rows] = await readDb.query(
            `SELECT mandi_id, opening_time, closing_time, pending_opening_time, pending_closing_time, effective_date, updated_at,
                    CASE WHEN effective_date IS NOT NULL AND effective_date > CURDATE() AND pending_opening_time IS NOT NULL THEN 1 ELSE 0 END as has_pending_change
             FROM mandi_timing
             WHERE mandi_id = ?`,
            [req.user.mandi_id]
        );

        const timing = rows.length > 0 ? rows[0] : null;
        const hasPending = Boolean(timing && timing.has_pending_change);

        return res.status(200).json({
            success: true,
            data: {
                mandi_id: req.user.mandi_id,
                opening_time: timing?.opening_time || "09:00:00",
                closing_time: timing?.closing_time || "17:00:00",
                pending_opening_time: hasPending ? timing.pending_opening_time : null,
                pending_closing_time: hasPending ? timing.pending_closing_time : null,
                effective_date: hasPending ? timing.effective_date : null,
                has_pending_change: hasPending,
                updated_at: timing?.updated_at
            }
        });
    } catch (error) {
        console.error("getMandiTiming error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateMandiTiming = async (req, res) => {
    try {
        const { opening_time, closing_time, password } = req.body;

        // Factor 2: Verification Password Check
        const expectedPassword = process.env.MANDI_TIMING_SETTINGS_PASSWORD;
        if (!password || !expectedPassword || password !== expectedPassword) {
            return res.status(403).json({
                success: false,
                message: "Additional verification failed."
            });
        }

        if (!opening_time || !closing_time) {
            return res.status(400).json({
                success: false,
                message: "opening_time and closing_time are required (format HH:MM or HH:MM:SS)"
            });
        }

        // Factor 1: Verify role in mandi_users
        const readDb = getReadDatabase().promise();
        const [users] = await readDb.query(
            `SELECT role, mandi_id, username FROM mandi_users WHERE user_id = ?`,
            [req.user.user_id]
        );

        if (users.length === 0 || users[0].role !== "mandi_operator" || Number(users[0].mandi_id) !== Number(req.user.mandi_id)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied: Only mandi_operator can modify Mandi operating hours"
            });
        }

        // 7-Day Delay Implementation:
        // Do NOT overwrite current opening_time and closing_time.
        // Save pending values with effective_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY).
        const writeDb = getWriteDatabase().promise();
        await writeDb.query(
            `INSERT INTO mandi_timing (mandi_id, opening_time, closing_time, pending_opening_time, pending_closing_time, effective_date)
             VALUES (?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY))
             ON DUPLICATE KEY UPDATE 
                pending_opening_time = VALUES(pending_opening_time), 
                pending_closing_time = VALUES(pending_closing_time),
                effective_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY)`,
            [req.user.mandi_id, opening_time, closing_time, opening_time, closing_time]
        );

        const [timingRows] = await writeDb.query(
            `SELECT opening_time, closing_time, pending_opening_time, pending_closing_time, effective_date FROM mandi_timing WHERE mandi_id = ?`,
            [req.user.mandi_id]
        );
        const updatedTiming = timingRows[0];

        // Record recent log
        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: users[0].username,
                recent_activity: `Mandi operating hours scheduled to ${opening_time} - ${closing_time} (Effective in 7 days)`
            });
        } catch (logErr) {
            console.error("Log error in updateMandiTiming:", logErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Mandi operating hours update scheduled successfully. Changes will become effective on ${updatedTiming.effective_date ? new Date(updatedTiming.effective_date).toLocaleDateString() : '7 days from today'}.`,
            data: {
                mandi_id: req.user.mandi_id,
                current_opening_time: updatedTiming.opening_time,
                current_closing_time: updatedTiming.closing_time,
                pending_opening_time: updatedTiming.pending_opening_time,
                pending_closing_time: updatedTiming.pending_closing_time,
                effective_date: updatedTiming.effective_date,
                has_pending_change: true
            }
        });
    } catch (error) {
        console.error("updateMandiTiming error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getMandiWorkingDays = async (req, res) => {
    try {
        const readDb = getReadDatabase().promise();
        const writeDb = getWriteDatabase().promise();

        // 1. Promote any mature pending working days (effective_date <= CURDATE())
        await writeDb.query(
            `UPDATE mandi_working_day 
             SET is_working = pending_is_working,
                 pending_is_working = NULL,
                 effective_date = NULL
             WHERE mandi_id = ? 
               AND effective_date IS NOT NULL 
               AND effective_date <= CURDATE() 
               AND pending_is_working IS NOT NULL`,
            [req.user.mandi_id]
        );

        const [rows] = await readDb.query(
            `SELECT working_day_id, mandi_id, day_of_week, is_working, pending_is_working, effective_date, updated_at,
                    CASE WHEN effective_date IS NOT NULL AND effective_date > CURDATE() AND pending_is_working IS NOT NULL THEN 1 ELSE 0 END as has_pending_change
             FROM mandi_working_day
             WHERE mandi_id = ?
             ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')`,
            [req.user.mandi_id]
        );

        const formatted = rows.map(r => ({
            working_day_id: r.working_day_id,
            mandi_id: r.mandi_id,
            day_of_week: r.day_of_week,
            is_working: Boolean(r.is_working),
            pending_is_working: r.has_pending_change ? Boolean(r.pending_is_working) : null,
            effective_date: r.has_pending_change ? r.effective_date : null,
            has_pending_change: Boolean(r.has_pending_change),
            updated_at: r.updated_at
        }));

        return res.status(200).json({
            success: true,
            data: formatted
        });
    } catch (error) {
        console.error("getMandiWorkingDays error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateMandiWorkingDays = async (req, res) => {
    try {
        const { working_days, password } = req.body;

        // Factor 2: Verification Password Check
        const expectedPassword = process.env.MANDI_TIMING_SETTINGS_PASSWORD;
        if (!password || !expectedPassword || password !== expectedPassword) {
            return res.status(403).json({
                success: false,
                message: "Additional verification failed."
            });
        }

        if (!Array.isArray(working_days) || working_days.length === 0) {
            return res.status(400).json({
                success: false,
                message: "working_days array is required"
            });
        }

        // Factor 1: Verify role in mandi_users
        const readDb = getReadDatabase().promise();
        const [users] = await readDb.query(
            `SELECT role, mandi_id, username FROM mandi_users WHERE user_id = ?`,
            [req.user.user_id]
        );

        if (users.length === 0 || users[0].role !== "mandi_operator" || Number(users[0].mandi_id) !== Number(req.user.mandi_id)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied: Only mandi_operator can modify Mandi working days"
            });
        }

        // 7-Day Delay Implementation:
        // Do NOT overwrite current is_working.
        // Save pending values with effective_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY).
        const pool = getWriteDatabase().promise();
        const conn = await pool.getConnection();

        try {
            await conn.beginTransaction();

            for (const item of working_days) {
                if (item.day_of_week) {
                    await conn.query(
                        `INSERT INTO mandi_working_day (mandi_id, day_of_week, is_working, pending_is_working, effective_date)
                         VALUES (?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY))
                         ON DUPLICATE KEY UPDATE 
                            pending_is_working = VALUES(pending_is_working),
                            effective_date = DATE_ADD(CURDATE(), INTERVAL 7 DAY)`,
                        [req.user.mandi_id, item.day_of_week, Boolean(item.is_working), Boolean(item.is_working)]
                    );
                }
            }

            await conn.commit();
        } catch (txErr) {
            await conn.rollback();
            throw txErr;
        } finally {
            conn.release();
        }

        const [rows] = await pool.query(
            `SELECT effective_date FROM mandi_working_day WHERE mandi_id = ? AND effective_date IS NOT NULL LIMIT 1`,
            [req.user.mandi_id]
        );
        const effectiveDate = rows[0]?.effective_date;

        // Record recent log
        try {
            await MandiRecentLogs.create({
                user_id: req.user.user_id,
                username: users[0].username,
                recent_activity: "Mandi working days schedule update scheduled (Effective in 7 days)"
            });
        } catch (logErr) {
            console.error("Log error in updateMandiWorkingDays:", logErr.message);
        }

        return res.status(200).json({
            success: true,
            message: `Weekly working days schedule update scheduled successfully. Changes will become effective on ${effectiveDate ? new Date(effectiveDate).toLocaleDateString() : '7 days from today'}.`,
            data: {
                effective_date: effectiveDate,
                has_pending_change: true
            }
        });
    } catch (error) {
        console.error("updateMandiWorkingDays error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getRecentLogs = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const count = Math.min(50, Math.max(1, parseInt(req.query.count, 10) || 10));
        const skip = (page - 1) * count;

        const total = await MandiRecentLogs.countDocuments({ user_id: req.user.user_id });
        const logs = await MandiRecentLogs.find({ user_id: req.user.user_id })
            .sort({ navigate_at: -1 })
            .skip(skip)
            .limit(count)
            .select("recent_activity username navigate_at")
            .lean();

        return res.status(200).json({
            success: true,
            page,
            count,
            total,
            totalPages: Math.ceil(total / count),
            data: logs
        });
    } catch (error) {
        console.error("getRecentLogs error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    getMandiMe,
    getMandiTiming,
    updateMandiTiming,
    getMandiWorkingDays,
    updateMandiWorkingDays,
    getRecentLogs
};
