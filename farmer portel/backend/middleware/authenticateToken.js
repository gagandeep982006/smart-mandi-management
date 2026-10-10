const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    try {
        const token = req.cookies?.farmer_token || req.cookies?.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.farmer_id) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload"
            });
        }

        // Authoritative farmer identity set strictly from verified JWT
        req.user = {
            farmer_id: decoded.farmer_id
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = authenticateToken;
