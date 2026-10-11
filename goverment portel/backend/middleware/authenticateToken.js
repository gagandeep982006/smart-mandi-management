const jwt = require("jsonwebtoken");

/**
 * Authenticates request strictly using the HttpOnly `gov_token` cookie.
 * All alternative sources (Authorization Bearer header, `token` cookie, fallbacks) are explicitly prohibited.
 */
const authenticateToken = (req, res, next) => {
    try {
        const token = req.cookies?.gov_token || req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token is required"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = authenticateToken;