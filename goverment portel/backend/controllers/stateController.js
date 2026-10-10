const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const { applyLocationScope } = require("../utils/locationScope");
const RecentLogs = require("../model/mongomodel/RecentLogs")

const addState = async (req, res) => {
    try {
        const {
            state_name,
            state_code
        } = req.body;

        // Location authorization: only global admin can add states
        if (req.userScope && req.userScope.state_id !== null) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Only global administrators can add states"
            });
        }

        // Validation
        if (!state_name || !state_code) {
            return res.status(400).json({
                success: false,
                message: "State name and state code are required"
            });
        }

        const query = `
            INSERT INTO state
            (
                state_name,
                state_code
            )
            VALUES (?, ?)
        `;

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, [state_name, state_code]);

        const state_id = result.insertId;

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "state " + String(state_id) + " added successfully"
        });
        return res.status(201).json({
            success: true,
            message: "State added successfully",
            data: {
                state_id,
                state_name,
                state_code
            }
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "State already exists"
            });
        }

        console.error("Add state error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const removeState = async (req, res) => {
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

        if (req.userScope && req.userScope.state_id !== null) {
            if (req.userScope.district_id !== null || req.userScope.tehsil_id !== null) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: You are not authorized to delete states"
                });
            }
            if (req.userScope.state_id !== parsedStateId) {
                return res.status(404).json({
                    success: false,
                    message: "State not found"
                });
            }
        }

        const query = `
            DELETE FROM state
            WHERE state_id = ?
        `;

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, [parsedStateId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "State not found"
            });
        }
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "state " + String(state_id) + " removed"
        });
        return res.status(200).json({
            success: true,
            message: "State deleted successfully"
        });

    } catch (error) {
        // State is being used by district, farmer or procurement quota
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "State cannot be deleted because it is being used by other records"
            });
        }

        console.error("Remove state error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getAllStates = async (req, res) => {
    try {
        const query = `
            SELECT
                state_id,
                state_name,
                state_code
            FROM state
            ORDER BY state_name
        `;

        const scoped = applyLocationScope(query, [], req.userScope, {
            stateColumn: "state_id"
        });

        const db = getReadDatabase().promise();
        const [rows] = await db.query(scoped.query, scoped.values);

        return res.status(200).json({
            success: true,
            states: rows
        });

    } catch (error) {
        console.error("Get all states error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTotalStates = async (req, res) => {
    try {
        const query = `
            SELECT COUNT(*) AS total_states
            FROM state
        `;

        const scoped = applyLocationScope(query, [], req.userScope, {
            stateColumn: "state_id"
        });

        const db = getReadDatabase().promise();
        const [rows] = await db.query(scoped.query, scoped.values);

        return res.status(200).json({
            success: true,
            total_states: rows[0].total_states
        });

    } catch (error) {
        console.error("Get total states error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addState,
    getAllStates,
    removeState,
    getTotalStates
};