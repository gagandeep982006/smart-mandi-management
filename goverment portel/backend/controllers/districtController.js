const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const { applyLocationScope } = require("../utils/locationScope");
const RecentLogs = require("../model/mongomodel/RecentLogs")

const addDistrict = async (req, res) => {
    try {
        const {
            state_id,
            district_name,
            district_code
        } = req.body;

        // Validation
        if (
            !state_id ||
            !district_name ||
            !district_code
        ) {
            return res.status(400).json({
                success: false,
                message: "state_id, district_name and district_code are required"
            });
        }

        const parsedStateId = parseInt(state_id, 10);
        if (isNaN(parsedStateId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid state_id"
            });
        }

        // Scope authorization
        if (req.userScope) {
            if (req.userScope.district_id !== null || req.userScope.tehsil_id !== null) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: You are not authorized to create districts"
                });
            }
            if (req.userScope.state_id !== null && req.userScope.state_id !== parsedStateId) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: State ID is outside your authorized scope"
                });
            }
        }

        const query = `
            INSERT INTO district
            (
                state_id,
                district_name,
                district_code
            )
            VALUES (?, ?, ?)
        `;

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, [
            parsedStateId,
            district_name,
            district_code
        ]);

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "District " + String(result.insertId) + " added successfully"
        });

        return res.status(201).json({
            success: true,
            message: "District added successfully",
            data: {
                district_id: result.insertId,
                state_id: parsedStateId,
                district_name,
                district_code
            }
        });

    } catch (error) {
        console.error("Add district error:", error);

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message: "The provided state_id does not exist"
            });
        }

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "District name or district code already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const removeDistrict = async (req, res) => {
    try {
        const { district_id } = req.params;

        if (!district_id) {
            return res.status(400).json({
                success: false,
                message: "District ID is required"
            });
        }

        const parsedDistrictId = parseInt(district_id, 10);
        if (isNaN(parsedDistrictId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid District ID"
            });
        }

        if (req.userScope) {
            if (req.userScope.tehsil_id !== null) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: You are not authorized to delete districts"
                });
            }
            if (req.userScope.district_id !== null && req.userScope.district_id !== parsedDistrictId) {
                return res.status(404).json({
                    success: false,
                    message: "District not found"
                });
            }
        }

        const baseQuery = `
            DELETE FROM district
            WHERE district_id = ?
        `;
        const { query, values } = applyLocationScope(
            baseQuery,
            [parsedDistrictId],
            req.userScope,
            { stateColumn: "state_id" }
        );

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "District not found"
            });
        }

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "District id " + String(district_id) + " removed successfully"
        });

        return res.status(200).json({
            success: true,
            message: "District deleted successfully"
        });

    } catch (error) {
        // District is being used by tehsil or farmer
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "District cannot be deleted because it is being used by a tehsil or farmer"
            });
        }

        console.error("Remove district error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getDistrictsByState = async (req, res) => {
    try {
        const { state_id } = req.params;

        if (!state_id) {
            return res.status(400).json({
                success: false,
                message: "State ID is required"
            });
        }

        const parsedStateId = parseInt(state_id, 10);
        if (isNaN(parsedStateId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid State ID"
            });
        }

        if (req.userScope && req.userScope.state_id !== null && req.userScope.state_id !== parsedStateId) {
            return res.status(404).json({
                success: false,
                message: "State not found"
            });
        }

        const baseQuery = `
            SELECT
                district_id,
                district_name,
                district_code
            FROM district
            WHERE state_id = ?
            ORDER BY district_name
        `;
        const { query, values } = applyLocationScope(
            baseQuery,
            [parsedStateId],
            req.userScope,
            { districtColumn: "district_id" }
        );

        const db = getReadDatabase().promise();
        const [rows] = await db.query(query, values);

        return res.status(200).json({
            success: true,
            districts: rows
        });

    } catch (error) {
        console.error("Get districts by state error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTotalDistricts = async (req, res) => {
    try {
        const baseQuery = `
            SELECT COUNT(*) AS total_districts
            FROM district
        `;
        const { query, values } = applyLocationScope(
            baseQuery,
            [],
            req.userScope,
            { stateColumn: "state_id", districtColumn: "district_id" }
        );

        const db = getReadDatabase().promise();
        const [rows] = await db.query(query, values);

        return res.status(200).json({
            success: true,
            total_districts: rows[0].total_districts
        });

    } catch (error) {
        console.error("Get total districts error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addDistrict,
    removeDistrict,
    getDistrictsByState,
    getTotalDistricts
};