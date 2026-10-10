const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const { applyLocationScope, validateLocationInScope } = require("../utils/locationScope");
const MandiHistory = require("../model/mongomodel/MandiHistory");
const RecentLogs = require("../model/mongomodel/RecentLogs")

const addMandi = async (req, res) => {
    try {
        const { mandi_name, tehsil_id, capacity } = req.body;

        // Validate required fields
        if (!mandi_name || !tehsil_id || capacity === undefined) {
            return res.status(400).json({
                success: false,
                message: "Mandi name, Tehsil ID and capacity are required"
            });
        }

        // Validate mandi name
        if (typeof mandi_name !== "string" || mandi_name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Mandi name is required"
            });
        }

        // Validate capacity
        if (capacity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be greater than 0"
            });
        }

        // Enforce user location scope on tehsil_id
        if (req.userScope) {
            if (req.userScope.tehsil_id !== null) {
                if (Number(tehsil_id) !== Number(req.userScope.tehsil_id)) {
                    return res.status(403).json({
                        success: false,
                        message: `Unauthorized tehsil access. Allowed tehsil_id is ${req.userScope.tehsil_id}`
                    });
                }
            } else if (req.userScope.district_id !== null) {
                const readDb = getReadDatabase().promise();
                const [tehsilRows] = await readDb.query(
                    "SELECT tehsil_id FROM tehsil WHERE tehsil_id = ? AND district_id = ?",
                    [tehsil_id, req.userScope.district_id]
                );
                if (tehsilRows.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: "Tehsil does not belong to your assigned district"
                    });
                }
            } else if (req.userScope.state_id !== null) {
                const readDb = getReadDatabase().promise();
                const [tehsilRows] = await readDb.query(
                    `SELECT t.tehsil_id FROM tehsil t
                     JOIN district d ON t.district_id = d.district_id
                     WHERE t.tehsil_id = ? AND d.state_id = ?`,
                    [tehsil_id, req.userScope.state_id]
                );
                if (tehsilRows.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: "Tehsil does not belong to your assigned state"
                    });
                }
            }
        }

        const query = `
            INSERT INTO mandi (
                mandi_name,
                tehsil_id,
                capacity
            )
            VALUES (?, ?, ?)
        `;

        const db = getWriteDatabase().promise();

        const [result] = await db.query(query, [
            mandi_name.trim(),
            tehsil_id,
            capacity
        ]);

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Mandi " + String(result.insertId) + " added successfully"
        });

        return res.status(201).json({
            success: true,
            message: "Mandi added successfully",
            mandi_id: result.insertId
        });

    } catch (error) {
        // Invalid tehsil_id
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message: "Invalid tehsil ID"
            });
        }

        console.error("Add mandi error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const removeMandi = async (req, res) => {
    try {
        const { mandi_id } = req.params;

        if (!mandi_id) {
            return res.status(400).json({
                success: false,
                message: "Mandi ID is required"
            });
        }

        const getMandiQuery = `
            SELECT
                m.mandi_id,
                m.mandi_name,
                m.tehsil_id,
                m.capacity,
                m.state_id,
                m.district_id
            FROM vw_mandis m
            WHERE m.mandi_id = ?
        `;

        const scopedGetMandi = applyLocationScope(
            getMandiQuery,
            [mandi_id],
            req.userScope,
            {
                stateColumn: "m.state_id",
                districtColumn: "m.district_id",
                tehsilColumn: "m.tehsil_id"
            }
        );

        const readDb = getReadDatabase().promise();

        const [mandiRows] = await readDb.query(
            scopedGetMandi.query,
            scopedGetMandi.values
        );

        if (mandiRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi not found"
            });
        }

        const mandi = mandiRows[0];

        const deleteQuery = `
            DELETE m
            FROM mandi m
            JOIN tehsil t
                ON m.tehsil_id = t.tehsil_id
            JOIN district d
                ON t.district_id = d.district_id
            WHERE m.mandi_id = ?
        `;

        const scopedDelete = applyLocationScope(
            deleteQuery,
            [mandi_id],
            req.userScope,
            {
                stateColumn: "d.state_id",
                districtColumn: "d.district_id",
                tehsilColumn: "m.tehsil_id"
            }
        );

        const writeDb = getWriteDatabase().promise();

        const [result] = await writeDb.query(
            scopedDelete.query,
            scopedDelete.values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi not found"
            });
        }

        await MandiHistory.create({
            deleted_by:req.user.user_id,
            mandi_id: mandi.mandi_id,
            mandi_name: mandi.mandi_name,
            tehsil_id: mandi.tehsil_id,
            capacity: mandi.capacity
        });

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Mandi id " + String(mandi_id) + " removed"
        });

        return res.status(200).json({
            success: true,
            message: "Mandi removed successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateMandi = async (req, res) => {
    try {
        const { mandi_id } = req.params;
        const { mandi_name, capacity } = req.body;

        if (!mandi_id) {
            return res.status(400).json({
                success: false,
                message: "Mandi ID is required"
            });
        }

        if (!mandi_name || capacity === undefined) {
            return res.status(400).json({
                success: false,
                message: "Mandi name and capacity are required"
            });
        }

        // Validate mandi name
        if (typeof mandi_name !== "string" || mandi_name.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Mandi name is required"
            });
        }

        // Validate capacity
        if (capacity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Capacity must be greater than 0"
            });
        }

        // =====================================================
        // CHECK TOTAL CAPACITY OF EXISTING COUNTERS
        // =====================================================

        const counterCapacityQuery = `
            SELECT 
                COALESCE(SUM(mc.capacity_per_day), 0) AS total_counter_capacity
            FROM mandi_counter mc
            WHERE mc.mandi_id = ?
        `;

        const readDb = getReadDatabase().promise();

        const [counterRows] = await readDb.query(
            counterCapacityQuery,
            [mandi_id]
        );

        const totalCounterCapacity =
            Number(counterRows[0].total_counter_capacity) || 0;

        // New mandi capacity cannot be less than
        // the total capacity already assigned to its counters
        if (Number(capacity) < totalCounterCapacity) {
            return res.status(400).json({
                success: false,
                message: `Mandi capacity cannot be less than the total counter capacity (${totalCounterCapacity})`
            });
        }

        // =====================================================
        // UPDATE MANDI
        // =====================================================

        const query = `
            UPDATE mandi m
            JOIN tehsil t ON m.tehsil_id = t.tehsil_id
            JOIN district d ON t.district_id = d.district_id
            SET 
                m.mandi_name = ?,
                m.capacity = ?
            WHERE m.mandi_id = ?
        `;

        const updateValues = [
            mandi_name.trim(),
            capacity,
            mandi_id
        ];

        const scopedUpdate = applyLocationScope(
            query,
            updateValues,
            req.userScope,
            {
                stateColumn: "d.state_id",
                districtColumn: "d.district_id",
                tehsilColumn: "m.tehsil_id"
            }
        );

        const db = getWriteDatabase().promise();

        const [result] = await db.query(
            scopedUpdate.query,
            scopedUpdate.values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Mandi not found"
            });
        }

        // =====================================================
        // RECENT LOG
        // =====================================================

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Mandi id " + String(mandi_id) + " updated"
        });

        return res.status(200).json({
            success: true,
            message: "Mandi name and capacity updated successfully"
        });

    } catch (error) {

        console.error("Update mandi error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getMandis = async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;

        const {
            state_id = null,
            district_id = null,
            tehsil_id = null
        } = req.body;

        page = parseInt(page);
        limit = parseInt(limit);

        // Validate pagination
        if (isNaN(page) || page < 1) {
            return res.status(400).json({
                success: false,
                message: "Page must be a positive number"
            });
        }

        if (isNaN(limit) || limit < 1) {
            return res.status(400).json({
                success: false,
                message: "Limit must be a positive number"
            });
        }

        const offset = (page - 1) * limit;

        const db = getReadDatabase().promise();

        // Build filters for user-supplied location query params (when global admin)
        const conditions = [];
        const filterParams = [];

        if (!req.userScope || req.userScope.state_id === null) {
            if (state_id !== null) {
                conditions.push("m.state_id = ?");
                filterParams.push(state_id);
            }
        }
        if (!req.userScope || req.userScope.district_id === null) {
            if (district_id !== null) {
                conditions.push("m.district_id = ?");
                filterParams.push(district_id);
            }
        }
        if (!req.userScope || req.userScope.tehsil_id === null) {
            if (tehsil_id !== null) {
                conditions.push("m.tehsil_id = ?");
                filterParams.push(tehsil_id);
            }
        }

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(" AND ")}`
                : "";

        // Count filtered mandis
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM vw_mandis m
            ${whereClause}
        `;

        const scopedCount = applyLocationScope(countQuery, filterParams, req.userScope, {
            stateColumn: "m.state_id",
            districtColumn: "m.district_id",
            tehsilColumn: "m.tehsil_id"
        });

        const [countResult] = await db.query(
            scopedCount.query,
            scopedCount.values
        );

        const totalMandis = countResult[0].total;

        // Get mandis
        const query = `
            SELECT
                m.mandi_id,
                m.mandi_name,
                m.tehsil_id,
                m.tehsil_name,
                m.district_id,
                m.district_name,
                m.state_id,
                m.state_name,
                m.capacity,
                m.created_at,
                m.status
            FROM vw_mandis m
            ${whereClause}
            ORDER BY m.mandi_id ASC
            LIMIT ? OFFSET ?
        `;

        const scopedData = applyLocationScope(query, [...filterParams, limit, offset], req.userScope, {
            stateColumn: "m.state_id",
            districtColumn: "m.district_id",
            tehsilColumn: "m.tehsil_id"
        });

        const [mandis] = await db.query(
            scopedData.query,
            scopedData.values
        );

        const totalPages = Math.ceil(totalMandis / limit);

        return res.status(200).json({
            success: true,
            data: mandis,
            pagination: {
                currentPage: page,
                limit: limit,
                totalMandis,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });

    } catch (error) {
        console.error("Get mandis error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTotalMandis = async (req, res) => {
    try {
        const query = `
            SELECT COUNT(*) AS totalMandis
            FROM vw_mandis m
        `;

        const scoped = applyLocationScope(query, [], req.userScope, {
            stateColumn: "m.state_id",
            districtColumn: "m.district_id",
            tehsilColumn: "m.tehsil_id"
        });

        const db = getReadDatabase().promise();

        const [rows] = await db.query(scoped.query, scoped.values);

        return res.status(200).json({
            success: true,
            totalMandis: rows[0].totalMandis
        });

    } catch (error) {
        console.error("Get total mandis error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addMandi,
    removeMandi,
    updateMandi,
    getMandis,
    getTotalMandis
};