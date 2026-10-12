const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getReadDatabase, getWriteDatabase } = require("../services/databaserouter");
const { recordAuditLog } = require("../services/auditLogService");
const {
    getClientIp,
    normalizePhoneNumber,
    checkOtpRequestAllowed,
    recordOtpRequest,
    checkVerificationAllowed,
    recordFailedVerification,
    recordSuccessfulVerification
} = require("../services/securityStore");

async function getMe(req, res) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Not authenticated"
        });
    }

    return res.status(200).json({
        success: true,
        user: req.user
    });
}

async function logout(req, res) {
    try {
        if (req.user) {
            await recordAuditLog({
                state_id: req.user.state_id,
                operator_id: req.user.payment_user_id,
                operator_username: req.user.username,
                action: "LOGOUT",
                outcome: "SUCCESS",
                reason: "User logged out",
                ip_address: req.ip || null
            });
        }

        const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
        const isProduction = process.env.NODE_ENV === "production";
        const useSecure = Boolean(isProduction && isHttps);
        const clearOptions = {
            httpOnly: true,
            secure: useSecure,
            sameSite: useSecure ? "none" : "lax",
            path: "/"
        };
        res.clearCookie("payment_token", clearOptions);
        res.clearCookie("token", clearOptions);

        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (err) {
        console.error("[Logout Error]:", err);
        return res.status(500).json({
            success: false,
            message: "Error processing logout"
        });
    }
}

async function requestOtp(req, res) {
    try {
        const clientIp = getClientIp(req);
        const rawPhone = req.body.phone_number;
        if (!rawPhone) {
            return res.status(400).json({
                success: false,
                message: "Registered phone number is required"
            });
        }

        const cleanPhone = normalizePhoneNumber(rawPhone);
        if (!cleanPhone) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit registered phone number"
            });
        }

        const allowedCheck = checkOtpRequestAllowed(cleanPhone, clientIp);
        if (!allowedCheck.allowed) {
            const isLockout = allowedCheck.reason === "PHONE_LOCKED_OUT" || allowedCheck.reason === "IP_LOCKED_OUT";
            const isCooldown = allowedCheck.reason === "COOLDOWN";
            let msg = "Too many requests. Please try again later.";
            if (isLockout) {
                msg = `Account is locked. Cooldown remaining: ${Math.ceil(allowedCheck.retryAfterSeconds / 60)} minute(s).`;
            } else if (isCooldown) {
                msg = `Please wait ${allowedCheck.retryAfterSeconds} second(s) before requesting a new OTP.`;
            }
            return res.status(429).json({
                success: false,
                message: msg,
                retry_after: allowedCheck.retryAfterSeconds,
                cooldown_seconds: allowedCheck.retryAfterSeconds,
                remaining_attempts: isLockout ? 0 : undefined,
                is_locked: isLockout,
                is_cooldown: isCooldown
            });
        }

        const readDb = getReadDatabase().promise();
        const writeDb = getWriteDatabase().promise();

        const [users] = await readDb.query(
            `SELECT pud.payment_user_id, pud.phone_number, pud.full_name, pu.username, pu.role, pu.state_id, pu.status
             FROM paymentuserdetails pud
             JOIN payment_users pu ON pud.payment_user_id = pu.payment_user_id
             WHERE pud.phone_number = ?`,
            [cleanPhone]
        );

        if (users.length === 0) {
            recordOtpRequest(cleanPhone, clientIp);
            return res.status(400).json({
                success: false,
                message: "Invalid registered phone number or account inactive"
            });
        }

        const user = users[0];
        if (user.status !== "active") {
            recordOtpRequest(cleanPhone, clientIp);
            return res.status(403).json({
                success: false,
                message: "Account is inactive. Please contact administration."
            });
        }

        await writeDb.query(
            `DELETE FROM payment_login_otp WHERE payment_user_id = ? AND (verified = 0 OR expires_at < NOW())`,
            [user.payment_user_id]
        );

        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await writeDb.query(
            `INSERT INTO payment_login_otp (payment_user_id, otp_hash, expires_at, attempts, verified)
             VALUES (?, ?, ?, 0, 0)`,
            [user.payment_user_id, otpHash, expiresAt]
        );

        recordOtpRequest(cleanPhone, clientIp);

        const maxAttempts = parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS, 10) || 5;
        return res.status(200).json({
            success: true,
            message: "OTP sent successfully to your registered mobile number",
            phone_number: cleanPhone,
            max_attempts: maxAttempts,
            remaining_attempts: maxAttempts,
            resend_cooldown: 5 * 60,
            otp: otp
        });
    } catch (error) {
        console.error("requestOtp error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate login OTP"
        });
    }
}

async function verifyOtp(req, res) {
    try {
        const clientIp = getClientIp(req);
        const rawPhone = req.body.phone_number;
        const rawOtp = req.body.otp;
        const ipAddress = clientIp;

        if (!rawPhone || !rawOtp) {
            return res.status(400).json({
                success: false,
                message: "Phone number and OTP are required"
            });
        }

        const cleanPhone = normalizePhoneNumber(rawPhone);
        const cleanOtp = String(rawOtp).trim();

        if (!cleanPhone) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 10-digit registered phone number"
            });
        }

        if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid 6-digit numeric OTP"
            });
        }

        const verifyAllowed = checkVerificationAllowed(cleanPhone, clientIp);
        if (!verifyAllowed.allowed) {
            return res.status(429).json({
                success: false,
                message: `Account is locked due to multiple failed attempts. Cooldown remaining: ${Math.ceil(verifyAllowed.retryAfterSeconds / 60)} minute(s).`,
                retry_after: verifyAllowed.retryAfterSeconds,
                cooldown_seconds: verifyAllowed.retryAfterSeconds,
                remaining_attempts: 0,
                is_locked: true
            });
        }

        const readDb = getReadDatabase().promise();
        const writeDb = getWriteDatabase().promise();

        const [users] = await readDb.query(
            `SELECT pud.payment_user_id, pud.phone_number, pud.full_name,
                    pu.username, pu.role, pu.permissions, pu.state_id, pu.status,
                    s.state_name, s.state_code
             FROM paymentuserdetails pud
             JOIN payment_users pu ON pud.payment_user_id = pu.payment_user_id
             JOIN state s ON pu.state_id = s.state_id
             WHERE pud.phone_number = ?`,
            [cleanPhone]
        );

        if (users.length === 0) {
            const failResult = recordFailedVerification(cleanPhone, clientIp);
            if (failResult.isLockedOut) {
                return res.status(429).json({
                    success: false,
                    message: "Too many requests. Please try again later.",
                    retry_after: failResult.retryAfterSeconds
                });
            }
            return res.status(400).json({
                success: false,
                message: "Unable to verify the OTP. Please check the code and try again."
            });
        }

        const user = users[0];
        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Account is inactive"
            });
        }

        const maxAttempts = parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS, 10) || 5;

        const [otps] = await writeDb.query(
            `SELECT otp_id, otp_hash, expires_at, attempts, verified
             FROM payment_login_otp
             WHERE payment_user_id = ?
             ORDER BY otp_id DESC
             LIMIT 1`,
            [user.payment_user_id]
        );

        if (otps.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Unable to verify the OTP. Please check the code and try again."
            });
        }

        const otpRecord = otps[0];
        const now = new Date();

        if (otpRecord.verified) {
            const isOtpMatch = await bcrypt.compare(cleanOtp, otpRecord.otp_hash);
            if (isOtpMatch && now < new Date(otpRecord.expires_at)) {
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

                const token = jwt.sign(
                    {
                        payment_user_id: user.payment_user_id,
                        username: user.username,
                        role: user.role,
                        state_id: user.state_id,
                        permissions: permissions
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
                );

                const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
                const isProduction = process.env.NODE_ENV === "production";
                const useSecure = Boolean(isProduction && isHttps);

                res.cookie("payment_token", token, {
                    httpOnly: true,
                    secure: useSecure,
                    sameSite: useSecure ? "none" : "lax",
                    path: "/",
                    maxAge: 24 * 60 * 60 * 1000
                });

                return res.status(200).json({
                    success: true,
                    message: "Login successful",
                    user: {
                        payment_user_id: user.payment_user_id,
                        username: user.username,
                        full_name: user.full_name,
                        phone_number: user.phone_number,
                        role: user.role,
                        state_id: user.state_id,
                        state_name: user.state_name,
                        state_code: user.state_code,
                        permissions: permissions
                    }
                });
            }

            return res.status(400).json({
                success: false,
                message: "Unable to verify the OTP. Please check the code and try again."
            });
        }

        if (new Date(otpRecord.expires_at) < now) {
            return res.status(400).json({
                success: false,
                message: "Unable to verify the OTP. Please check the code and try again."
            });
        }

        if (otpRecord.attempts >= maxAttempts) {
            const failResult = recordFailedVerification(cleanPhone, clientIp);
            return res.status(429).json({
                success: false,
                message: `Maximum attempts reached. Account is locked for ${Math.ceil(failResult.retryAfterSeconds / 60)} minute(s).`,
                retry_after: failResult.retryAfterSeconds,
                cooldown_seconds: failResult.retryAfterSeconds,
                remaining_attempts: 0,
                max_attempts: maxAttempts,
                is_locked: true
            });
        }

        const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otp_hash);
        if (!isMatch) {
            await writeDb.query(
                `UPDATE payment_login_otp SET attempts = attempts + 1 WHERE otp_id = ?`,
                [otpRecord.otp_id]
            );

            await recordAuditLog({
                state_id: user.state_id,
                operator_id: user.payment_user_id,
                operator_username: user.username,
                action: "LOGIN",
                outcome: "FAILURE",
                reason: "Incorrect OTP attempt",
                ip_address: ipAddress
            });

            const failResult = recordFailedVerification(cleanPhone, clientIp);
            if (failResult.isLockedOut) {
                return res.status(429).json({
                    success: false,
                    message: `Maximum OTP verification attempts reached. Account is locked for ${Math.ceil(failResult.retryAfterSeconds / 60)} minute(s).`,
                    retry_after: failResult.retryAfterSeconds,
                    cooldown_seconds: failResult.retryAfterSeconds,
                    remaining_attempts: 0,
                    max_attempts: maxAttempts,
                    is_locked: true
                });
            }
            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${failResult.remainingAttempts} attempt(s) remaining.`,
                remaining_attempts: failResult.remainingAttempts,
                max_attempts: maxAttempts
            });
        }

        await writeDb.query(
            `UPDATE payment_login_otp SET verified = 1 WHERE otp_id = ?`,
            [otpRecord.otp_id]
        );

        recordSuccessfulVerification(cleanPhone, clientIp);

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

        const token = jwt.sign(
            {
                payment_user_id: user.payment_user_id,
                username: user.username,
                role: user.role,
                state_id: user.state_id,
                permissions: permissions
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
        );

        const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
        const isProduction = process.env.NODE_ENV === "production";
        const useSecure = Boolean(isProduction && isHttps);

        res.cookie("payment_token", token, {
            httpOnly: true,
            secure: useSecure,
            sameSite: useSecure ? "none" : "lax",
            path: "/",
            maxAge: 24 * 60 * 60 * 1000
        });

        await recordAuditLog({
            state_id: user.state_id,
            operator_id: user.payment_user_id,
            operator_username: user.username,
            action: "LOGIN",
            outcome: "SUCCESS",
            reason: "User authenticated successfully via OTP",
            ip_address: ipAddress
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                payment_user_id: user.payment_user_id,
                username: user.username,
                full_name: user.full_name,
                phone_number: user.phone_number,
                role: user.role,
                state_id: user.state_id,
                state_name: user.state_name,
                state_code: user.state_code,
                permissions: permissions
            }
        });
    } catch (err) {
        console.error("verifyOtp controller error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error during verification"
        });
    }
}

async function getProfile(req, res) {
    try {
        if (!req.user || !req.user.payment_user_id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const readDb = getReadDatabase().promise();
        const [rows] = await readDb.query(
            `SELECT 
                pu.payment_user_id,
                pu.username,
                pu.role,
                pu.permissions,
                pu.status,
                pu.created_at,
                pud.full_name,
                pud.phone_number,
                pud.email,
                pud.address,
                pud.aadhaar_lookup,
                s.state_id,
                s.state_name,
                s.state_code
             FROM payment_users pu
             LEFT JOIN paymentuserdetails pud ON pu.payment_user_id = pud.payment_user_id
             LEFT JOIN state s ON pu.state_id = s.state_id
             WHERE pu.payment_user_id = ?`,
            [req.user.payment_user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        const user = rows[0];
        let permissions = [];
        try {
            permissions = typeof user.permissions === "string" ? JSON.parse(user.permissions) : user.permissions;
        } catch (e) {
            permissions = [];
        }

        const maskedAadhaar = user.aadhaar_lookup ? `XXXX-XXXX-${String(user.payment_user_id).padStart(4, '0')}` : "Not Linked";

        return res.status(200).json({
            success: true,
            data: {
                payment_user_id: user.payment_user_id,
                user_id: user.payment_user_id,
                username: user.username,
                full_name: user.full_name || user.username,
                phone_number: user.phone_number || "Not Registered",
                email: user.email || "N/A",
                address: user.address || "N/A",
                masked_aadhaar: maskedAadhaar,
                role: user.role,
                permissions: permissions,
                status: user.status,
                created_at: user.created_at,
                state: {
                    state_id: user.state_id,
                    state_name: user.state_name,
                    state_code: user.state_code
                }
            }
        });
    } catch (error) {
        console.error("getProfile error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load user profile"
        });
    }
}

module.exports = {
    getMe,
    logout,
    requestOtp,
    verifyOtp,
    getProfile
};
