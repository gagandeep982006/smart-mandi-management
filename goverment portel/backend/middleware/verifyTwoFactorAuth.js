const verifyTwoFactorAuth = (req, res, next) => {
    // Step 1: Normal authenticated Admin/DBA authorization
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "User not authenticated"
        });
    }

    const role = (req.user.role || "").toLowerCase();
    if (role !== "admin" && role !== "dba") {
        return res.status(403).json({
            success: false,
            message: "Access denied: Only Admin or DBA can perform this operation"
        });
    }

    const verificationPassword =
        req.headers["x-verification-password"] ||
        req.headers["x-gov-verification-password"] ||
        req.body?.verification_password ||
        req.body?.verificationPassword ||
        req.body?.security_password ||
        req.body?.password_2fa ||
        req.query?.verification_password ||
        req.query?.verificationPassword;

    const expectedPassword = process.env.GOV_SECURITY_VERIFICATION_PASSWORD;

    if (!verificationPassword || !expectedPassword || verificationPassword !== expectedPassword) {
        return res.status(403).json({
            success: false,
            message: "Two-Factor Verification failed. Invalid or missing verification password."
        });
    }

    // Verification passed
    next();
};

module.exports = verifyTwoFactorAuth;
