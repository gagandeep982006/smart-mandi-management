const { getReadDatabase } = require("../services/databaserouter");

const loadUserScope = async (req, res, next) => {
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        const readDb = getReadDatabase().promise();

        const [users] = await readDb.query(
            `SELECT state_id, district_id, tehsil_id, status
             FROM app_users
             WHERE user_id = ?`,
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(403).json({
                success: false,
                message: "User account not found"
            });
        }

        const user = users[0];

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "User account is inactive"
            });
        }

        req.userScope = {
            state_id: user.state_id !== null && user.state_id !== undefined ? Number(user.state_id) : null,
            district_id: user.district_id !== null && user.district_id !== undefined ? Number(user.district_id) : null,
            tehsil_id: user.tehsil_id !== null && user.tehsil_id !== undefined ? Number(user.tehsil_id) : null
        };

        next();
    } catch (error) {
        console.error("loadUserScope middleware error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

loadUserScope.loadUserScope = loadUserScope;

module.exports = loadUserScope;
