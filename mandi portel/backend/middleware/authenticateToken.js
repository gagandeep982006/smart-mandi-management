const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
    try {
        let token = req.cookies?.mandi_token || req.cookies?.token;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access token is required"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            user_id: decoded.user_id,
            permissions: decoded.permissions,
            mandi_id: decoded.mandi_id,
            counter_ids: decoded.counter_ids
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
