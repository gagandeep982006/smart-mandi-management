const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const RecentLogs = require("../model/mongomodel/RecentLogs")

const addProcurementSession = async (req, res) => {
    try {
        const {
            session_name,
            start_date,
            end_date,
            crop_id
        } = req.body;

        // Required fields
        if (!session_name || !start_date || !end_date || !crop_id) {
            return res.status(400).json({
                success: false,
                message: "Session name, start date, end date and crop ID are required"
            });
        }

        // Check date validity
        if (new Date(start_date) > new Date(end_date)) {
            return res.status(400).json({
                success: false,
                message: "Start date cannot be after end date"
            });
        }

        const query = `
            INSERT INTO procurement_session (
                session_name,
                start_date,
                end_date,
                crop_id
            )
            VALUES (?, ?, ?, ?)
        `;

        const values = [
            session_name,
            start_date,
            end_date,
            crop_id
        ];

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, values);

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Procurement Session " + String(result.insertId) + " added successfully"
        });

        return res.status(201).json({
            success: true,
            message: "Procurement session added successfully",
            session_id: result.insertId
        });

    } catch (error) {
        // Crop does not exist
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message: "Crop does not exist"
            });
        }

        console.error("Add procurement session error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const removeProcurementSession = async (req, res) => {
    try {
        const { session_id } = req.params;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });
        }

        const query = `
            DELETE FROM procurement_session
            WHERE session_id = ?
        `;

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, [session_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Procurement session not found"
            });
        }
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Procurement Session " + String(session_id) + " removed"
        });

        return res.status(200).json({
            success: true,
            message: "Procurement session removed successfully"
        });

    } catch (error) {
        // Session may be referenced by another table
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "Cannot remove procurement session because it is being used by another record"
            });
        }

        console.error("Remove procurement session error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getProcurementSessions = async (req, res) => {
    try {
        const db = getReadDatabase().promise();

        const query = `
            SELECT
                session_id,
                session_name,
                crop_id,
                crop_name,
                start_date,
                end_date,
                created_at
            FROM vw_procurement_sessions
            ORDER BY session_id DESC
        `;

        const [sessions] = await db.query(query);

        return res.status(200).json({
            success: true,
            totalSessions: sessions.length,
            data: sessions
        });

    } catch (error) {

        console.error(
            "Get procurement sessions error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateProcurementSessionDates = async (req, res) => {
    const readDb = getReadDatabase().promise();
    const writeDb = getWriteDatabase().promise();

    try {
        const { session_id } = req.params;
        const { start_date, end_date } = req.body;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: "Session ID is required"
            });
        }

        const [sessions] = await readDb.query(
            `
            SELECT
                session_id,
                start_date,
                end_date
            FROM vw_procurement_sessions
            WHERE session_id = ?
            `,
            [session_id]
        );

        if (sessions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Procurement session not found"
            });
        }

        const session = sessions[0];

        const [todayResult] = await readDb.query(
            `SELECT CURDATE() AS today`
        );

        const today = todayResult[0].today;

        const currentStart = new Date(session.start_date);
        const currentEnd = new Date(session.end_date);
        const currentDate = new Date(today);

        let sessionStatus;

        if (currentEnd < currentDate) {
            sessionStatus = "ended";
        } else if (currentStart <= currentDate && currentEnd >= currentDate) {
            sessionStatus = "active";
        } else {
            sessionStatus = "upcoming";
        }

        if (sessionStatus === "ended") {
            return res.status(400).json({
                success: false,
                message: "Ended procurement session cannot be modified"
            });
        }
        if (sessionStatus === "active") {
            if (start_date !== undefined) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be modified for an active session"
                });
            }
            if (end_date === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "End date is required for an active session"
                });
            }
            const newEndDate = new Date(end_date);

            if (isNaN(newEndDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid end date"
                });
            }

            if (newEndDate < currentDate) {
                return res.status(400).json({
                    success: false,
                    message: "End date cannot be earlier than the current date"
                });
            }
            if (newEndDate < currentStart) {
                return res.status(400).json({
                    success: false,
                    message: "End date cannot be earlier than the session start date"
                });
            }

            const [result] = await writeDb.query(
                `
                UPDATE procurement_session
                SET end_date = ?
                WHERE session_id = ?
                `,
                [end_date, session_id]
            );
            await RecentLogs.create({
                user_id: req.user.user_id,
                username: req.user.username,
                recent_activity: "Procurement Session " + String(session_id) + " updated"
            });

            return res.status(200).json({
                success: true,
                message: "Active procurement session end date updated successfully",
                session_id: Number(session_id),
                start_date: session.start_date,
                end_date: end_date
            });
        }

        if (sessionStatus === "upcoming") {
            if (start_date === undefined || end_date === undefined) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Start date and end date are required for an upcoming session"
                });
            }

            const newStartDate = new Date(start_date);
            const newEndDate = new Date(end_date);

            if (
                isNaN(newStartDate.getTime()) ||
                isNaN(newEndDate.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid start date or end date"
                });
            }

            const minimumStartDate = new Date(currentDate);
            minimumStartDate.setDate(
                minimumStartDate.getDate() + 7
            );

            if (newStartDate < minimumStartDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Upcoming session start date cannot be earlier than 7 days from the current date"
                });
            }

            if (newEndDate < newStartDate) {
                return res.status(400).json({
                    success: false,
                    message:
                        "End date cannot be earlier than the start date"
                });
            }

            const [result] = await writeDb.query(
                `
                UPDATE procurement_session
                SET
                    start_date = ?,
                    end_date = ?
                WHERE session_id = ?
                `,
                [
                    start_date,
                    end_date,
                    session_id
                ]
            );
            await RecentLogs.create({
                user_id: req.user.user_id,
                username: req.user.username,
                recent_activity: "Procurement Session " + String(session_id) + " updated"
            });

            return res.status(200).json({
                success: true,
                message:
                    "Upcoming procurement session dates updated successfully",
                session_id: Number(session_id),
                start_date: start_date,
                end_date: end_date
            });
        }

    } catch (error) {

        console.error(
            "Update procurement session dates error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTotalProcurementSessions = async (req, res) => {
    try {
        const db = getReadDatabase().promise();

        const query = `
            SELECT COUNT(*) AS totalSessions
            FROM procurement_session
        `;

        const [result] = await db.query(query);

        return res.status(200).json({
            success: true,
            totalSessions: result[0].totalSessions
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getProcurementChartStats = async (req, res) => {
    try {
        const { groupBy = "month", year } = req.query;
        const db = getReadDatabase().promise();

        if (groupBy === "crop") {
            const query = `
                SELECT 
                    c.crop_name AS label,
                    ROUND(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.quantity_approved ELSE 0 END) / 10, 1) AS val
                FROM booking b
                JOIN crop c ON b.crop_id = c.crop_id
                GROUP BY c.crop_id, c.crop_name
                ORDER BY val DESC
                LIMIT 10
            `;
            const [rows] = await db.query(query);
            const data = rows.map(r => ({ label: r.label, val: Number(r.val) || 0 }));
            const maxVal = Math.max(...data.map(d => d.val), 100);
            return res.status(200).json({
                success: true,
                groupBy: "crop",
                unit: "MT",
                data,
                maxVal: Math.ceil(maxVal * 1.15)
            });
        }

        if (groupBy === "state") {
            const query = `
                SELECT 
                    s.state_name AS label,
                    ROUND(SUM(CASE WHEN b.status = 'COMPLETED' THEN b.quantity_approved ELSE 0 END) / 10, 1) AS val
                FROM booking b
                JOIN mandi_counter mc ON b.counter_id = mc.counter_id
                JOIN mandi m ON mc.mandi_id = m.mandi_id
                JOIN tehsil t ON m.tehsil_id = t.tehsil_id
                JOIN district d ON t.district_id = d.district_id
                JOIN state s ON d.state_id = s.state_id
                GROUP BY s.state_id, s.state_name
                ORDER BY val DESC
                LIMIT 10
            `;
            const [rows] = await db.query(query);
            const data = rows.map(r => ({ label: r.label, val: Number(r.val) || 0 }));
            const maxVal = Math.max(...data.map(d => d.val), 100);
            return res.status(200).json({
                success: true,
                groupBy: "state",
                unit: "MT",
                data,
                maxVal: Math.ceil(maxVal * 1.15)
            });
        }

        // Default: monthly trend
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let query = `
            SELECT 
                DATE_FORMAT(booking_time, '%b') AS label,
                DATE_FORMAT(booking_time, '%m') AS month_num,
                ROUND(SUM(CASE WHEN status = 'COMPLETED' THEN quantity_approved ELSE 0 END) / 10, 1) AS val
            FROM booking
        `;
        const params = [];
        if (year) {
            query += ` WHERE YEAR(booking_time) = ?`;
            params.push(year);
        }
        query += `
            GROUP BY month_num, label
            ORDER BY month_num
        `;

        const [rows] = await db.query(query, params);
        const monthMap = {};
        rows.forEach(r => { monthMap[r.label] = Number(r.val) || 0; });

        const data = MONTHS.map(m => ({
            label: m,
            val: monthMap[m] || 0
        }));
        const maxVal = Math.max(...data.map(d => d.val), 100);

        return res.status(200).json({
            success: true,
            groupBy: "month",
            unit: "MT",
            data,
            maxVal: Math.ceil(maxVal * 1.15)
        });

    } catch (error) {
        console.error("Get procurement chart stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch procurement chart stats"
        });
    }
};

module.exports = {
    addProcurementSession,
    removeProcurementSession,
    getProcurementSessions,
    updateProcurementSessionDates,
    getTotalProcurementSessions,
    getProcurementChartStats
};