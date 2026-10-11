const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getReadDatabase, getWriteDatabase } = require("../services/databaserouter");
const MandiLoginLogs = require("../model/mongomodel/MandiLoginLogs");
const { VALID_PERMISSIONS } = require("../utils/constants");
const {
    getClientIp,
    normalizePhoneNumber,
    checkOtpRequestAllowed,
    recordOtpRequest,
    checkVerificationAllowed,
    recordFailedVerification,
    recordSuccessfulVerification
} = require("../services/securityStore");

// Helper function to convert JWT expiration string into milliseconds for cookie maxAge
const parseExpiryToMs = (expiry) => {
    if (typeof expiry === "number") return expiry * 1000;
    const match = String(expiry).match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 60 * 1000; // default 1 hour
    const val = parseInt(match[1], 10);
    switch (match[2]) {
        case "s": return val * 1000;
        case "m": return val * 60 * 1000;
        case "h": return val * 60 * 60 * 1000;
        case "d": return val * 24 * 60 * 60 * 1000;
        default: return 60 * 60 * 1000;
    }
};

const logout = async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === "production";
        const clearOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/"
        };
        res.clearCookie("mandi_token", clearOptions);
        res.clearCookie("token", clearOptions);

        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        console.error("Logout controller error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        const { user_id, permissions, mandi_id, counter_ids } = req.user;

        return res.status(200).json({
            success: true,
            data: {
                user_id,
                permissions,
                mandi_id,
                counter_ids
            }
        });
    } catch (error) {
        console.error("GetMe controller error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const requestOtp = async (req, res) => {
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

        // Check in-memory security store for lockouts, 5-minute cooldown, and rate limits
        const allowedCheck = checkOtpRequestAllowed(cleanPhone, clientIp);
        if (!allowedCheck.allowed) {
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later.",
                retry_after: allowedCheck.retryAfterSeconds
            });
        }

        const readDb = getReadDatabase().promise();
        const writeDb = getWriteDatabase().promise();

        // Check mandiuserdetails and mandi_users
        const [users] = await readDb.query(
            `SELECT mud.user_id, mud.phone_number, mud.full_name, mu.username, mu.role, mu.mandi_id, mu.status
             FROM mandiuserdetails mud
             JOIN mandi_users mu ON mud.user_id = mu.user_id
             WHERE mud.phone_number = ?`,
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
                message: "User account is inactive. Please contact administration."
            });
        }

        // Invalidate previous active OTPs
        await writeDb.query(
            `DELETE FROM mandi_login_otp WHERE user_id = ? AND (verified = 0 OR expires_at < NOW())`,
            [user.user_id]
        );

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await writeDb.query(
            `INSERT INTO mandi_login_otp (user_id, otp_hash, expires_at, attempts, verified)
             VALUES (?, ?, ?, 0, 0)`,
            [user.user_id, otpHash, expiresAt]
        );

        // Record successful OTP generation to enforce resend cooldown & rate limits
        recordOtpRequest(cleanPhone, clientIp);

        // Report missing SMS integration clearly in console(for developer mode only)
        if(process.env.NODE_ENV !== "production"){
            console.log("\n========================================================");
            console.log(`🔑 [DEV ONLY] Mandi Portal OTP for mobile ${cleanPhone}: >>> ${otp} <<<`);
            console.log("========================================================\n");
        }

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully to your registered mobile number",
            phone_number: cleanPhone,
            otp:otp
        });
    } catch (error) {
        console.error("requestOtp error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate login OTP"
        });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const clientIp = getClientIp(req);
        const rawPhone = req.body.phone_number;
        const rawOtp = req.body.otp;

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

        // Pre-check: Reject immediately if phone or IP is currently locked out
        const verifyAllowed = checkVerificationAllowed(cleanPhone, clientIp);
        if (!verifyAllowed.allowed) {
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later.",
                retry_after: verifyAllowed.retryAfterSeconds
            });
        }

        const readDb = getReadDatabase().promise();
        const writeDb = getWriteDatabase().promise();

        const [users] = await readDb.query(
            `SELECT mud.user_id, mud.phone_number, mud.full_name,
                    mu.user_id, mu.username, mu.role, mu.permissions, mu.mandi_id, mu.status
             FROM mandiuserdetails mud
             JOIN mandi_users mu ON mud.user_id = mu.user_id
             WHERE mud.phone_number = ?`,
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
                message: "User account is inactive"
            });
        }

        // Fetch latest active OTP
        const [otps] = await readDb.query(
            `SELECT otp_id, otp_hash, expires_at, attempts, verified
             FROM mandi_login_otp
             WHERE user_id = ? AND verified = 0
             ORDER BY otp_id DESC
             LIMIT 1`,
            [user.user_id]
        );

        if (otps.length === 0) {
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

        const otpRecord = otps[0];

        if (new Date() > new Date(otpRecord.expires_at)) {
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

        if (otpRecord.attempts >= 5) {
            const failResult = recordFailedVerification(cleanPhone, clientIp);
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later.",
                retry_after: failResult.retryAfterSeconds
            });
        }

        const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otp_hash);
        if (!isMatch) {
            await writeDb.query(
                `UPDATE mandi_login_otp SET attempts = attempts + 1 WHERE otp_id = ?`,
                [otpRecord.otp_id]
            );
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

        // Mark OTP as verified
        await writeDb.query(
            `UPDATE mandi_login_otp SET verified = 1 WHERE otp_id = ?`,
            [otpRecord.otp_id]
        );

        // Reset failed verification count for this phone upon successful authentication
        recordSuccessfulVerification(cleanPhone, clientIp);

        // Parse permissions
        let rawPermissions;
        try {
            rawPermissions = typeof user.permissions === "string"
                ? JSON.parse(user.permissions)
                : user.permissions;
        } catch (parseError) {
            rawPermissions = [];
        }
        if (!Array.isArray(rawPermissions)) {
            rawPermissions = [];
        }

        const normalized = rawPermissions.map(p => (p === "create" ? "write" : p));
        const permissions = [...new Set(normalized.filter(p => VALID_PERMISSIONS.includes(p)))];

        // Fetch counter IDs
        const [counters] = await readDb.query(
            `SELECT counter_id
             FROM mandi_user_counters
             WHERE user_id = ?
             ORDER BY counter_id ASC`,
            [user.user_id]
        );

        const counter_ids = counters.map(row => Number(row.counter_id));

        // Create JWT & cookie
        const jwtExpiry = process.env.JWT_EXPIRES_IN || "1h";
        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                permissions: permissions,
                mandi_id: user.mandi_id,
                counter_ids: counter_ids
            },
            process.env.JWT_SECRET,
            { expiresIn: jwtExpiry }
        );

        const isProduction = process.env.NODE_ENV === "production";
        const cookieMaxAge = parseExpiryToMs(jwtExpiry);
        res.cookie("mandi_token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            path: "/",
            maxAge: cookieMaxAge
        });

        // Mongo log
        try {
            await MandiLoginLogs.create({
                user_id: user.user_id,
                username: user.username,
                role: user.role
            });
        } catch (mongoError) {
            console.error("Error creating MandiLoginLogs entry:", mongoError.message);
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                phone_number: user.phone_number,
                permissions,
                mandi_id: user.mandi_id,
                counter_ids
            }
        });
    } catch (error) {
        console.error("verifyOtp controller error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during verification"
        });
    }
};

const getProfile = async (req, res) => {
    try {
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const readDb = getReadDatabase().promise();

        // 1. Fetch user + mandi info
        const [rows] = await readDb.query(
            `SELECT 
                mu.user_id,
                mu.username,
                mu.role,
                mu.permissions,
                mu.mandi_id,
                mu.status,
                mu.created_at,
                mud.full_name,
                mud.phone_number,
                mud.email,
                mud.address,
                mud.aadhaar_lookup,
                m.mandi_name,
                t.tehsil_name,
                d.district_name,
                s.state_name
             FROM mandi_users mu
             LEFT JOIN mandiuserdetails mud ON mu.user_id = mud.user_id
             LEFT JOIN mandi m ON mu.mandi_id = m.mandi_id
             LEFT JOIN tehsil t ON m.tehsil_id = t.tehsil_id
             LEFT JOIN district d ON t.district_id = d.district_id
             LEFT JOIN state s ON d.state_id = s.state_id
             WHERE mu.user_id = ?`,
            [req.user.user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        const user = rows[0];

        // 2. Fetch assigned counters
        const [counters] = await readDb.query(
            `SELECT mc.counter_id, mc.counter_number, mc.counter_name, c.crop_name
             FROM mandi_user_counters muc
             JOIN mandi_counter mc ON muc.counter_id = mc.counter_id
             LEFT JOIN crop c ON mc.crop_id = c.crop_id
             WHERE muc.user_id = ?
             ORDER BY mc.counter_number ASC`,
            [user.user_id]
        );

        let permissions = [];
        try {
            permissions = typeof user.permissions === "string" ? JSON.parse(user.permissions) : user.permissions;
        } catch (e) {
            permissions = [];
        }

        const maskedAadhaar = user.aadhaar_lookup ? `XXXX-XXXX-${String(user.user_id).padStart(4, '0')}` : "Not Linked";

        return res.status(200).json({
            success: true,
            data: {
                user_id: user.user_id,
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
                mandi: {
                    mandi_id: user.mandi_id,
                    mandi_name: user.mandi_name,
                    mandi_location: `${user.district_name || ""}, ${user.state_name || ""}`.trim(),
                    state: user.state_name,
                    district: user.district_name
                },
                counters: counters.map(c => ({
                    counter_id: c.counter_id,
                    counter_number: c.counter_number,
                    counter_name: c.counter_name,
                    crop_name: c.crop_name || "All Crops"
                }))
            }
        });
    } catch (error) {
        console.error("getProfile error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load user profile"
        });
    }
};

module.exports = {
    logout,
    getMe,
    requestOtp,
    verifyOtp,
    getProfile
};
