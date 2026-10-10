const requirePermission = (...requiredPermissions) => {
    // Flatten in case an array was passed as a single argument
    const permissionsToCheck = requiredPermissions.flat();

    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        const userPermissions = user.permissions;

        if (!Array.isArray(userPermissions)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        const hasAllPermissions = permissionsToCheck.every(permission =>
            userPermissions.includes(permission)
        );

        if (!hasAllPermissions) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        next();
    };
};

const requireAnyPermission = (...requiredPermissions) => {
    const permissionsToCheck = requiredPermissions.flat();

    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        const userPermissions = user.permissions;

        if (!Array.isArray(userPermissions)) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        const hasAnyPermission = permissionsToCheck.some(permission =>
            userPermissions.includes(permission)
        );

        if (!hasAnyPermission) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        next();
    };
};

// Support both `require("../middleware/requirePermission")` and destructured `{ requirePermission, requireAnyPermission }`
requirePermission.requirePermission = requirePermission;
requirePermission.requireAnyPermission = requireAnyPermission;

module.exports = requirePermission;
