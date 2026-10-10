const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const { applyLocationScope } = require("../utils/locationScope");
const RecentLogs = require("../model/mongomodel/RecentLogs")

const addFarmerLand = async (req, res) => {
    try {
        const {
            farmer_id,
            area,
            ownership_type,
            land_type
        } = req.body;

        if (
            !farmer_id ||
            area === undefined ||
            !ownership_type ||
            !land_type
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Farmer ID, area, ownership type and land type are required"
            });
        }

        if (
            area === null ||
            isNaN(area) ||
            Number(area) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Area must be greater than 0"
            });
        }

        const validOwnershipTypes = [
            "owned",
            "leased",
            "shared"
        ];

        if (!validOwnershipTypes.includes(ownership_type)) {
            return res.status(400).json({
                success: false,
                message:
                    "Ownership type must be owned, leased or shared"
            });
        }

        const validLandTypes = [
            "agricultural",
            "irrigated",
            "non_irrigated"
        ];

        if (!validLandTypes.includes(land_type)) {
            return res.status(400).json({
                success: false,
                message:
                    "Land type must be agricultural, irrigated or non_irrigated"
            });
        }

        // Verify that the farmer exists and belongs to user's location scope
        const readDb = getReadDatabase().promise();
        const checkQuery = `SELECT f.farmer_id FROM farmer f WHERE f.farmer_id = ?`;
        const scopedCheck = applyLocationScope(checkQuery, [farmer_id], req.userScope, {
            stateColumn: "f.state_id",
            districtColumn: "f.district_id",
            tehsilColumn: "f.tehsil_id"
        });

        const [farmers] = await readDb.query(
            scopedCheck.query,
            scopedCheck.values
        );

        if (farmers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer does not exist"
            });
        }

        const query = `
            INSERT INTO farmer_land (
                farmer_id,
                area,
                ownership_type,
                land_type,
                land_verification,
                land_verified_at
            )
            VALUES (?, ?, ?, ?, 'pending', NULL)
        `;


        const values = [
            farmer_id,
            area,
            ownership_type,
            land_type
        ];


        const db = getWriteDatabase().promise();

        const [result] = await db.query(
            query,
            values
        );

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Farmer " + String(farmer_id) + " land added successfully"
        });

        return res.status(201).json({
            success: true,
            message: "Farmer land added successfully",
            land_id: result.insertId,
            land_verification: "pending"
        });


    } catch (error) {
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({
                success: false,
                message: "Farmer does not exist"
            });
        }


        console.error(
            "Add farmer land error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const removeFarmerLand = async (req, res) => {
    try {
        const { land_id } = req.params;


        if (!land_id) {
            return res.status(400).json({
                success: false,
                message: "Land ID is required"
            });
        }


        const deleteQuery = `
            DELETE fl
            FROM farmer_land fl
            JOIN farmer f ON fl.farmer_id = f.farmer_id
            WHERE fl.land_id = ?
        `;

        const scopedDelete = applyLocationScope(deleteQuery, [land_id], req.userScope, {
            stateColumn: "f.state_id",
            districtColumn: "f.district_id",
            tehsilColumn: "f.tehsil_id"
        });

        const db = getWriteDatabase().promise();

        const [result] = await db.query(
            scopedDelete.query,
            scopedDelete.values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer land record not found"
            });
        }

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Farmer land id " + String(land_id) + " remove successfully"
        });

        return res.status(200).json({
            success: true,
            message: "Farmer land removed successfully"
        });

    } catch (error) {

        console.error(
            "Remove farmer land error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getFarmerLand = async (req, res) => {
    try {
        const { farmer_id } = req.params;

        if (!farmer_id) {
            return res.status(400).json({
                success: false,
                message: "Farmer ID is required"
            });
        }

        const db = getReadDatabase().promise();

        // Verify farmer exists within user's location scope
        const checkQuery = `SELECT f.farmer_id FROM farmer f WHERE f.farmer_id = ?`;
        const scopedCheck = applyLocationScope(checkQuery, [farmer_id], req.userScope, {
            stateColumn: "f.state_id",
            districtColumn: "f.district_id",
            tehsilColumn: "f.tehsil_id"
        });

        const [farmers] = await db.query(
            scopedCheck.query,
            scopedCheck.values
        );

        if (farmers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });
        }

        const query = `
            SELECT
                land_id,
                farmer_id,
                area,
                ownership_type,
                land_type,
                land_verification,
                land_verified_at,
                created_at
            FROM farmer_land
            WHERE farmer_id = ?
            ORDER BY created_at DESC
        `;

        const [lands] = await db.query(
            query,
            [farmer_id]
        );

        return res.status(200).json({
            success: true,
            farmer_id: Number(farmer_id),
            total_records: lands.length,
            data: lands
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const changeLandVerificationStatus = async (req, res) => {
    try {
        const { land_id } = req.params;
        const { land_verification } = req.body;

        if (!land_id) {
            return res.status(400).json({
                success: false,
                message: "Land ID is required"
            });
        }

        if (
            land_verification === undefined ||
            land_verification === null
        ) {
            return res.status(400).json({
                success: false,
                message: "Land verification status is required"
            });
        }

        const allowedStatuses = [
            "pending",
            "verified",
            "rejected"
        ];

        if (!allowedStatuses.includes(land_verification)) {
            return res.status(400).json({
                success: false,
                message:
                    "Land verification must be pending, verified or rejected"
            });
        }

        const db = getWriteDatabase().promise();

        let baseQuery;
        let baseValues;

        if (land_verification === "verified") {
            baseQuery = `
                UPDATE farmer_land fl
                JOIN farmer f ON fl.farmer_id = f.farmer_id
                SET
                    fl.land_verification = ?,
                    fl.land_verified_at = CURRENT_TIMESTAMP
                WHERE fl.land_id = ?
            `;
            baseValues = [land_verification, land_id];
        } else {
            baseQuery = `
                UPDATE farmer_land fl
                JOIN farmer f ON fl.farmer_id = f.farmer_id
                SET
                    fl.land_verification = ?,
                    fl.land_verified_at = NULL
                WHERE fl.land_id = ?
            `;
            baseValues = [land_verification, land_id];
        }

        const scopedUpdate = applyLocationScope(baseQuery, baseValues, req.userScope, {
            stateColumn: "f.state_id",
            districtColumn: "f.district_id",
            tehsilColumn: "f.tehsil_id"
        });

        const [result] = await db.query(
            scopedUpdate.query,
            scopedUpdate.values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer land record not found"
            });
        }

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Farmer land id " + String(land_id) + " land verification change to " + String(land_verification)
        });

        return res.status(200).json({
            success: true,
            message: "Land verification status updated successfully",
            land_id: Number(land_id),
            land_verification: land_verification
        });

    } catch (error) {

        console.error(
            "Change land verification status error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addFarmerLand,
    removeFarmerLand,
    getFarmerLand,
    changeLandVerificationStatus
};