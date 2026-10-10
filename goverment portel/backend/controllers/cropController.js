const { getWriteDatabase, getReadDatabase } = require("../services/databaserouter");
const RecentLogs = require("../model/mongomodel/RecentLogs")

const addCrop = async (req, res) => {
    try {
        const {
            crop_name,
            crop_type
        } = req.body;

        // Required fields
        if (!crop_name || !crop_type) {
            return res.status(400).json({
                success: false,
                message: "Crop name and crop type are required"
            });
        }

        const query = `
            INSERT INTO crop (
                crop_name,
                crop_type
            )
            VALUES (?, ?)
        `;

        const values = [
            crop_name,
            crop_type
        ];

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, values);

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "New Crop " + String(crop_name) + " Added"
        });

        return res.status(201).json({
            success: true,
            message: "Crop added successfully",
            crop_id: result.insertId
        });

    } catch (error) {
        // Duplicate crop
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "This crop already exists"
            });
        }

        // Invalid ENUM value
        if (error.code === "WARN_DATA_TRUNCATED") {
            return res.status(400).json({
                success: false,
                message: "Invalid crop type. Use rabi, kharif or zaid"
            });
        }

        console.error("Add crop error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const removeCrop = async (req, res) => {
    try {
        const { crop_id } = req.params;

        if (!crop_id) {
            return res.status(400).json({
                success: false,
                message: "Crop ID is required"
            });
        }

        const query = `
            DELETE FROM crop
            WHERE crop_id = ?
        `;

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, [crop_id]);

        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Crop not found"
            });
        }
        
        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Crop id " + String(crop_id) + " removed successfully"
        });

        return res.status(200).json({
            success: true,
            message: "Crop removed successfully"
        });

    } catch (error) {
        // Crop is being used by another table
        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "Crop cannot be removed because it is being used in procurement sessions or quotas"
            });
        }

        console.error("Remove crop error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getCrops = async (req, res) => {
    try {
        const query = `
            SELECT
                c.crop_id,
                c.crop_name,
                c.crop_type,
                c.created_at
            FROM crop c
            ORDER BY c.created_at desc;
        `;

        const db = getReadDatabase().promise();
        const [rows] = await db.query(query);

        return res.status(200).json({
            success: true,
            crops: rows
        });

    } catch (error) {
        console.error("Get crops error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getTotalCrops = async (req, res) => {
    try {
        const query = `
            SELECT COUNT(*) AS total_crops
            FROM crop
        `;

        const db = getReadDatabase().promise();
        const [rows] = await db.query(query);

        return res.status(200).json({
            success: true,
            total_crops: rows[0].total_crops
        });

    } catch (error) {
        console.error("Get total crops error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const updateCrop = async (req, res) => {
    try {
        const { crop_id } = req.params;
        const { crop_name, crop_type } = req.body;

        if (!crop_id) {
            return res.status(400).json({
                success: false,
                message: "Crop ID is required"
            });
        }

        if (!crop_name || !crop_type) {
            return res.status(400).json({
                success: false,
                message: "Crop name and crop type are required"
            });
        }

        const query = `
            UPDATE crop
            SET
                crop_name = ?,
                crop_type = ?
            WHERE crop_id = ?
        `;

        const values = [
            crop_name,
            crop_type,
            crop_id
        ];

        const db = getWriteDatabase().promise();
        const [result] = await db.query(query, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Crop not found"
            });
        }

        await RecentLogs.create({
            user_id: req.user.user_id,
            username: req.user.username,
            recent_activity: "Crop id " + String(crop_id) + " updated successfully"
        });

        return res.status(200).json({
            success: true,
            message: "Crop updated successfully"
        });

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "This crop already exists"
            });
        }

        console.error("Update crop error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    addCrop,
    removeCrop,
    getCrops,
    getTotalCrops,
    updateCrop
};