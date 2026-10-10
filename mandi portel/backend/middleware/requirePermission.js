const { VALID_PERMISSIONS } = require("../utils/constants");

const requirePermission = (...requiredPermissions) => {
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

        // Validate that required permissions belong strictly to the 4 permitted operations
        const areAllValid = permissionsToCheck.every(permission =>
            VALID_PERMISSIONS.includes(permission)
        );

        if (!areAllValid) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        const hasPermissions = permissionsToCheck.every(permission =>
            userPermissions.includes(permission)
        );

        if (!hasPermissions) {
            return res.status(403).json({
                success: false,
                message: "Permission denied"
            });
        }

        next();
    };
};

module.exports = requirePermission;
