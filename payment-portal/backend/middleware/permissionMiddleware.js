/**
 * Permission Middleware for Payment Portal
 * 
 * Verifies that the authenticated payment user possesses the required permission:
 * - payment.read
 * - payment.process
 * - payment.update
 */
function requirePermission(requiredPermission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];

        if (!permissions.includes(requiredPermission)) {
            return res.status(403).json({
                success: false,
                message: `Access denied: Missing required permission '${requiredPermission}'`
            });
        }

        next();
    };
}

module.exports = requirePermission;
