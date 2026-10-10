const jwt = require("jsonwebtoken");
const { getReadDatabase } = require("../services/databaserouter");

/**
 * Authentication Middleware for Payment Portal
 * Extracts and verifies JWT from the HttpOnly cookie `payment_token`.
 * Loads the user's latest identity, active status, state_id, and permissions from the database.
 */
async function authenticatePaymentUser(req, res, next) {
    try {
        const token = req.cookies?.payment_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required: No session cookie found"
            });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("JWT_SECRET is not configured");
            return res.status(500).json({
                success: false,
                message: "Server authentication configuration error"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, secret);
        } catch (jwtErr) {
            return res.status(401).json({
                success: false,
                message: "Session expired or invalid: Please log in again"
            });
        }

        const userId = decoded.payment_user_id || decoded.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Malformed token payload"
            });
        }

        // Query active payment user from database
        const readDb = getReadDatabase().promise();
        const [rows] = await readDb.query(
            `SELECT pu.payment_user_id, pu.username, pu.role, pu.permissions, pu.state_id, pu.status,
                    s.state_name, s.state_code
             FROM payment_users pu
             JOIN state s ON pu.state_id = s.state_id
             WHERE pu.payment_user_id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User account not found or has been removed"
            });
        }

        const user = rows[0];

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Account is inactive. Please contact your system administrator"
            });
        }

        // Parse permissions array safely
        let permissions = [];
        try {
            if (typeof user.permissions === "string") {
                permissions = JSON.parse(user.permissions);
            } else if (Array.isArray(user.permissions)) {
                permissions = user.permissions;
            }
        } catch (e) {
            permissions = [];
        }

        req.user = {
            payment_user_id: user.payment_user_id,
            username: user.username,
            role: user.role,
            state_id: Number(user.state_id),
            state_name: user.state_name,
            state_code: user.state_code,
            permissions: permissions
        };

        next();
    } catch (err) {
        console.error("[Auth Middleware Error]:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error during authentication"
        });
    }
}

module.exports = authenticatePaymentUser;
