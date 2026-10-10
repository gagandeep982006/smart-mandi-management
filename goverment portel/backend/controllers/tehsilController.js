const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const { applyLocationScope } = require("../utils/locationScope");
const RecentLogs = require("../model/mongomodel/RecentLogs")

const addTehsil = async (req, res) => {
    try {
        const {
            district_id,
            tehsil_name,
            tehsil_code
        } = req.body;

        // Validation
        if (
            !district_id ||
            !tehsil_name ||
            !tehsil_code
        ) {
            return res.status(400).json({
                success: false,
                message: "district_id, tehsil_name and tehsil_code are required"
            });
        }

        const parsedDistrictId = parseInt(district_id, 10);
        if (isNaN(parsedDistrictId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid district_id"
            });
        }

        // Scope authorization
        if (req.userScope) {
            if (req.userScope.tehsil_id !== null) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: You are not authorized to create tehsils"
                });
            }
            if (req.userScope.district_id !== null && req.userScope.district_id !== parsedDistrictId) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: District ID is outside your authorized scope"
                });
            }
            if (req.userScope.state_id !== null && req.userScope.district_id === null) {
                const readDb = getReadDatabase().promise();
                const [dRows] = await readDb.query(
                    "SELECT district_id FROM district WHERE district_id = ? AND state_id = ?",
                    [parsedDistrictId, req.userScope.state_id]
                );
                if (dRows.length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: "Forbidden: District ID is outside your authorized state"
                    });
                }
            }
        }

        const query = `
            INSERT INTO tehsil
            (
                district_id,
                tehsil_name,
                tehsil_code
            )
            VALUES (?, ?, ?)
        `;

        const db = getWriteDatabase().promise();
        const [result] = await db.query(
            query,
            [
                parsedDistrictId,
                tehsil_name,
                tehsil_code
            ]
        );
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "tehsil " + String(result.insertId) + " added successfully"
        });
        return res.status(201).json({
            success: true,
            message: "Tehsil added successfully",
            data: {
                tehsil_id: result.insertId,
                district_id: parsedDistrictId,
                tehsil_name,
                tehsil_code
            }
        });

    } catch (error) {
        console.error("Add tehsil error:", error);

        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message: "The provided district_id does not exist"
            });
        }

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Tehsil name or tehsil code already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

const removeTehsil = async (req, res) => {
    try {
        const { tehsil_id } = req.params;

        if (!tehsil_id) {
            return res.status(400).json({
                success: false,
                message: "Tehsil ID is required"
            });
        }

        const parsedTehsilId = parseInt(tehsil_id, 10);
        if (isNaN(parsedTehsilId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Tehsil ID"
            });
        }

        if (req.userScope && req.userScope.tehsil_id !== null && req.userScope.tehsil_id !== parsedTehsilId) {
            return res.status(404).json({
                success: false,
                message: "Tehsil not found"
            });
        }

        const baseQuery = `
            DELETE t FROM tehsil t
            JOIN district d ON t.district_id = d.district_id
            WHERE t.tehsil_id = ?
        `;
        const { query, values } = applyLocationScope(
            baseQuery,
            [parsedTehsilId],
            req.userScope,
            { stateColumn: "d.state_id", districtColumn: "t.district_id", tehsilColumn: "t.tehsil_id" }
        );

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Tehsil not found"
            });
        }
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "tehsil " + String(tehsil_id) + " removed"
        });
        return res.status(200).json({
            success: true,
            message: "Tehsil deleted successfully"
        });

    } catch (error) {
        // Tehsil is being used by farmer
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "Tehsil cannot be deleted because it is being used by a farmer"
            });
        }

        console.error("Remove tehsil error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTehsilsByDistrict = async (req, res) => {
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
            if (req.userScope.district_id !== null && req.userScope.district_id !== parsedDistrictId) {
                return res.status(404).json({
                    success: false,
                    message: "Tehsils not found"
                });
            }
            if (req.userScope.state_id !== null && req.userScope.district_id === null) {
                const readDb = getReadDatabase().promise();
                const [dRows] = await readDb.query(
                    "SELECT district_id FROM district WHERE district_id = ? AND state_id = ?",
                    [parsedDistrictId, req.userScope.state_id]
                );
                if (dRows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Tehsils not found"
                    });
                }
            }
        }

        const baseQuery = `
            SELECT
                tehsil_id,
                tehsil_name,
                tehsil_code
            FROM tehsil
            WHERE district_id = ?
            ORDER BY tehsil_name
        `;
        const { query, values } = applyLocationScope(
            baseQuery,
            [parsedDistrictId],
            req.userScope,
            { tehsilColumn: "tehsil_id" }
        );

        const db = getReadDatabase().promise();
        const [rows] = await db.query(query, values);

        return res.status(200).json({
            success: true,
            tehsils: rows
        });

    } catch (error) {
        console.error("Get tehsils by district error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTotalTehsils = async (req, res) => {
    try {
        const baseQuery = `
            SELECT COUNT(*) AS total_tehsils
            FROM tehsil t
            JOIN district d ON t.district_id = d.district_id
        `;
        const { query, values } = applyLocationScope(
            baseQuery,
            [],
            req.userScope,
            { stateColumn: "d.state_id", districtColumn: "t.district_id", tehsilColumn: "t.tehsil_id" }
        );

        const db = getReadDatabase().promise();
        const [rows] = await db.query(query, values);

        return res.status(200).json({
            success: true,
            total_tehsils: rows[0].total_tehsils
        });

    } catch (error) {
        console.error("Get total tehsils error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addTehsil,
    removeTehsil,
    getTehsilsByDistrict,
    getTotalTehsils
};