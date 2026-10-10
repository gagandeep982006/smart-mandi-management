const {
    getWriteDatabase,
    getReadDatabase
} = require("../services/databaserouter");
const { applyLocationScope, validateLocationInScope } = require("../utils/locationScope");
const RecentLogs = require("../model/mongomodel/RecentLogs")

const addProcurementQuota = async (req, res) => {
    try {
        const {
            state_id,
            crop_id,
            amount,
            lsp,
            msp
        } = req.body;

        if (!state_id || !crop_id || !amount || !lsp || !msp) {
            return res.status(400).json({
                success: false,
                message: "State ID, crop ID, amount, lsp and msp are required"
            });
        }
        if(lsp > msp){
            return res.status(400).json({
                success: false,
                message: "msp must be greater then lsp"
            });
        }

        if (req.userScope && req.userScope.state_id !== null) {
            if (Number(state_id) !== Number(req.userScope.state_id)) {
                return res.status(403).json({
                    success: false,
                    message: `Unauthorized state access. Allowed state_id is ${req.userScope.state_id}`
                });
            }
        }

        if (amount <= 0 || lsp <= 0 || msp <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount,lsp and msp must be greater than 0"
            });
        }

        const query = `
            INSERT INTO procurement_quota (
                state_id,
                crop_id,
                amount,
                lsp,
                msp
            )
            VALUES (?, ?, ?, ?, ?)
        `;

        const values = [
            state_id,
            crop_id,
            amount,
            lsp,
            msp
        ];

        const db = getWriteDatabase().promise();

        const [result] = await db.query(
            query,
            values
        );

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Procurement Quota " + String(result.insertId) + " added successfully"
        });

        return res.status(201).json({
            success: true,
            message: "Procurement quota added successfully",
            quota_id: result.insertId
        });

    } catch (error) {

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message: "Invalid state or crop"
            });
        }

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "Procurement quota for this state and crop already exists"
            });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const removeProcurementQuota = async (req, res) => {
    try {
        const { quota_id } = req.params;

        if (!quota_id) {
            return res.status(400).json({
                success: false,
                message: "Quota ID is required"
            });
        }

        const deleteQuery = `
            DELETE FROM procurement_quota
            WHERE quota_id = ?
        `;

        const scopedDelete = applyLocationScope(deleteQuery, [quota_id], req.userScope, {
            stateColumn: "state_id"
        });

        const db = getWriteDatabase().promise();

        const [result] = await db.query(
            scopedDelete.query,
            scopedDelete.values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Procurement quota not found"
            });
        }

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Procurement Quota " + String(quota_id) + " removed"
        });

        return res.status(200).json({
            success: true,
            message: "Procurement quota removed successfully"
        });

    } catch (error) {

        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message:
                    "Cannot remove procurement quota because it is being used by another record"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateProcurementQuota = async (req, res) => {
    try {
        const { quota_id } = req.params;

        const {
            state_id,
            crop_id,
            amount,
            lsp,
            msp
        } = req.body;

        if (!quota_id) {
            return res.status(400).json({
                success: false,
                message: "Quota ID is required"
            });
        }

        if (
            !state_id ||
            !crop_id ||
            amount === undefined || lsp === undefined || msp === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "State ID, crop ID ,amount, lsp and msp are required"
            });
        }

        if(lsp > msp){
            return res.status(400).json({
                success: false,
                message: "msp must be greater then lsp"
            });
        }

        if (req.userScope && req.userScope.state_id !== null) {
            if (Number(state_id) !== Number(req.userScope.state_id)) {
                return res.status(403).json({
                    success: false,
                    message: `Unauthorized state access. Allowed state_id is ${req.userScope.state_id}`
                });
            }
        }

        if (amount <= 0 || lsp<= 0 || msp <= 0) {
            return res.status(400).json({
                success: false,
                message:
                    "Amount,lsp and msp must be greater than 0"
            });
        }

        const query = `
            UPDATE procurement_quota
            SET
                state_id = ?,
                crop_id = ?,
                amount = ?,
                lsp = ?,
                msp = ?
            WHERE quota_id = ?
        `;

        const scopedUpdate = applyLocationScope(
            query,
            [state_id, crop_id, amount,lsp,msp, quota_id],
            req.userScope,
            { stateColumn: "state_id" }
        );

        const db = getWriteDatabase().promise();

        const [result] = await db.query(
            scopedUpdate.query,
            scopedUpdate.values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Procurement quota not found"
            });
        }

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Procurement Quota " + String(quota_id) + " updated"
        });

        return res.status(200).json({
            success: true,
            message:
                "Procurement quota updated successfully"
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "A quota already exists for this state and crop"
            });
        }

        // Invalid state_id or crop_id
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid state ID or crop ID"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
const getProcurementQuotaByState = async (req, res) => {
    try {
        const { state_id } = req.params;
        if (!state_id) {
            return res.status(400).json({
                success: false,
                message: "State ID is required"
            });
        }

        if (
            isNaN(state_id) ||
            Number(state_id) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid State ID"
            });
        }

        if (req.userScope && req.userScope.state_id !== null) {
            if (Number(state_id) !== Number(req.userScope.state_id)) {
                return res.status(403).json({
                    success: false,
                    message: `Unauthorized state access. Allowed state_id is ${req.userScope.state_id}`
                });
            }
        }

        const query = `
            SELECT
                pq.quota_id,
                pq.state_id,
                pq.state_name,
                pq.crop_id,
                pq.crop_name,
                pq.amount,
                pq.lsp,
                pq.msp,
                pq.created_at
            FROM vw_procurement_quota pq
            WHERE pq.state_id = ?
            ORDER BY pq.quota_id DESC
        `;

        const scoped = applyLocationScope(query, [state_id], req.userScope, {
            stateColumn: "pq.state_id"
        });

        const db = getReadDatabase().promise();

        const [rows] = await db.query(
            scoped.query,
            scoped.values
        );

        return res.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addProcurementQuota,
    removeProcurementQuota,
    updateProcurementQuota,
    getProcurementQuotaByState
};