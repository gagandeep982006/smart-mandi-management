const { getReadDatabase } = require("../services/databaserouter");

/**
 * GET /api/locations/districts
 * Returns all districts belonging to the authenticated payment user's state.
 */
async function getDistricts(req, res) {
    try {
        const stateId = req.user.state_id;
        const readDb = getReadDatabase().promise();

        const [rows] = await readDb.query(
            "SELECT district_id, district_name FROM district WHERE state_id = ? ORDER BY district_name ASC",
            [stateId]
        );

        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error("[getDistricts Error]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch districts"
        });
    }
}

/**
 * GET /api/locations/tehsils?district_id=...
 * Returns all tehsils in the requested district, validating that the district belongs to user's state.
 */
async function getTehsils(req, res) {
    try {
        const stateId = req.user.state_id;
        const districtId = req.query.district_id;
        const readDb = getReadDatabase().promise();

        if (districtId) {
            // Validate district belongs to user's state
            const [dCheck] = await readDb.query(
                "SELECT district_id FROM district WHERE district_id = ? AND state_id = ?",
                [districtId, stateId]
            );

            if (dCheck.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized district access"
                });
            }

            const [rows] = await readDb.query(
                "SELECT tehsil_id, tehsil_name, district_id FROM tehsil WHERE district_id = ? ORDER BY tehsil_name ASC",
                [districtId]
            );

            return res.status(200).json({
                success: true,
                data: rows
            });
        }

        // If no district specified, return all tehsils in the user's state
        const [rows] = await readDb.query(
            `SELECT t.tehsil_id, t.tehsil_name, t.district_id 
             FROM tehsil t 
             JOIN district d ON t.district_id = d.district_id 
             WHERE d.state_id = ? 
             ORDER BY t.tehsil_name ASC`,
            [stateId]
        );

        return res.status(200).json({
            success: true,
            data: rows
        });
    } catch (err) {
        console.error("[getTehsils Error]:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch tehsils"
        });
    }
}

module.exports = {
    getDistricts,
    getTehsils
};
