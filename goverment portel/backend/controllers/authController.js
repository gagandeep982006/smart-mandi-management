const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const {
    getWriteDatabase,
    getReadDatabase
} = require("../services/databaserouter");
const { generateAadhaarLookup, generateAadhaarHash } = require("../services/aadhaarSecurity");
const LoginLogs = require('../model/mongomodel/LoginLogs');
const {
    getClientIp,
    normalizePhoneNumber,
    checkOtpRequestAllowed,
    recordOtpRequest,
    checkVerificationAllowed,
    recordFailedVerification,
    recordSuccessfulVerification
} = require("../services/securityStore");

const register = async (req, res) => {
    let connection;
    let transactionStarted = false;

    try {
        const {
            username,
            full_name,
            phone_number,
            email,
            address,
            aadhaar,
            role,
            permissions,
            state_id,
            district_id,
            tehsil_id
        } = req.body;

        // 1. Validate required fields
        if (!username || typeof username !== "string" || !username.trim()) {
            return res.status(400).json({
                success: false,
                message: "Username is required"
            });
        }
        if (username.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: "Username must be at least 3 characters long"
            });
        }

        if (!full_name || typeof full_name !== "string" || !full_name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Full name is required"
            });
        }

        if (!phone_number) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        const cleanPhone = String(phone_number).trim().replace(/\D/g, "");
        if (cleanPhone.length !== 10) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be a valid 10-digit number"
            });
        }

        // Validate optional email
        let cleanEmail = null;
        if (email && String(email).trim()) {
            cleanEmail = String(email).trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(cleanEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid email address"
                });
            }
        }

        // Validate optional Aadhaar
        let cleanAadhaar = null;
        if (aadhaar && String(aadhaar).trim()) {
            cleanAadhaar = String(aadhaar).trim().replace(/\D/g, "");
            if (cleanAadhaar.length !== 12) {
                return res.status(400).json({
                    success: false,
                    message: "Aadhaar number must be exactly 12 digits"
                });
            }
        }

        // Validate permissions format (default ["read"] if not provided)
        let formattedPermissions = JSON.stringify(["read"]);
        if (permissions !== undefined && permissions !== null) {
            if (typeof permissions === "string") {
                try {
                    const parsed = JSON.parse(permissions);
                    if (!Array.isArray(parsed)) {
                        return res.status(400).json({
                            success: false,
                            message: "Permissions must be an array"
                        });
                    }
                    formattedPermissions = permissions;
                } catch (e) {
                    return res.status(400).json({
                        success: false,
                        message: "Permissions must be a valid JSON array"
                    });
                }
            } else if (Array.isArray(permissions)) {
                formattedPermissions = JSON.stringify(permissions);
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Permissions must be an array or JSON array string"
                });
            }
        }

        const userRole = role ? String(role).trim() : "user";
        const stateId = state_id === undefined || state_id === null || state_id === "" ? null : Number(state_id);
        const districtId = district_id === undefined || district_id === null || district_id === "" ? null : Number(district_id);
        const tehsilId = tehsil_id === undefined || tehsil_id === null || tehsil_id === "" ? null : Number(tehsil_id);

        // Location hierarchy validation
        if (districtId !== null && stateId === null) {
            return res.status(400).json({
                success: false,
                message: "state_id is required when district_id is provided"
            });
        }

        if (tehsilId !== null && districtId === null) {
            return res.status(400).json({
                success: false,
                message: "district_id is required when tehsil_id is provided"
            });
        }

        const readDb = getReadDatabase().promise();

        // Verify district if provided
        if (districtId !== null) {
            const [districts] = await readDb.query(
                "SELECT district_id FROM district WHERE district_id = ? AND state_id = ?",
                [districtId, stateId]
            );
            if (districts.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "District does not belong to the selected state"
                });
            }
        }

        // Verify tehsil if provided
        if (tehsilId !== null) {
            const [tehsils] = await readDb.query(
                "SELECT tehsil_id FROM tehsil WHERE tehsil_id = ? AND district_id = ?",
                [tehsilId, districtId]
            );
            if (tehsils.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Tehsil does not belong to the selected district"
                });
            }
        }

        // 2. Duplicate checks
        const [existingUsers] = await readDb.query(
            "SELECT user_id FROM app_users WHERE username = ?",
            [username.trim()]
        );
        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        const [existingPhones] = await readDb.query(
            "SELECT detail_id FROM userdetails WHERE phone_number = ?",
            [cleanPhone]
        );
        if (existingPhones.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Phone number is already registered"
            });
        }

        let aadhaarLookup = null;
        let aadhaarHash = null;
        if (cleanAadhaar) {
            aadhaarLookup = generateAadhaarLookup(cleanAadhaar);
            aadhaarHash = await generateAadhaarHash(cleanAadhaar);

            const [existingAadhaar] = await readDb.query(
                "SELECT detail_id FROM userdetails WHERE aadhaar_lookup = ?",
                [aadhaarLookup]
            );
            if (existingAadhaar.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Aadhaar number is already registered"
                });
            }
        }

        // 3. Database transaction to insert into app_users and userdetails
        const writePool = getWriteDatabase().promise();
        connection = await writePool.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [userResult] = await connection.query(
            `INSERT INTO app_users (username, role, permissions, state_id, district_id, tehsil_id, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`,
            [
                username.trim(),
                userRole,
                formattedPermissions,
                stateId,
                districtId,
                tehsilId
            ]
        );

        const newUserId = userResult.insertId;

        await connection.query(
            `INSERT INTO userdetails (user_id, full_name, phone_number, email, address, aadhaar_lookup, aadhaar_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                newUserId,
                full_name.trim(),
                cleanPhone,
                cleanEmail,
                address ? String(address).trim() : null,
                aadhaarLookup,
                aadhaarHash
            ]
        );

        await connection.commit();
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user_id: newUserId
        });

    } catch (error) {
        if (transactionStarted && connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error("Rollback error:", rbErr);
            }
        }

        if (error.code === "ER_DUP_ENTRY") {
            if (error.message && error.message.includes("phone_number")) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number is already registered"
                });
            }
            if (error.message && error.message.includes("aadhaar_lookup")) {
                return res.status(409).json({
                    success: false,
                    message: "Aadhaar number is already registered"
                });
            }
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        console.error("Register user error:", error);
        return res.status(500).json({
            success: false,
            message: error.message && error.message.includes("Configuration error") 
                ? error.message 
                : "Internal server error"
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const logout = async (req, res) => {
    try {
        res.clearCookie("gov_token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });
        res.clearCookie("token", { path: "/" });
        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
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
                message: "Unauthorized"
            });
        }
        return res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
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

        // Check userdetails and app_users
        const [users] = await readDb.query(
            `SELECT ud.user_id, ud.phone_number, ud.full_name, au.username, au.role, au.status
             FROM userdetails ud
             JOIN app_users au ON ud.user_id = au.user_id
             WHERE ud.phone_number = ?`,
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

        // Invalidate previous active OTPs for this user
        await writeDb.query(
            `DELETE FROM gov_login_otp WHERE user_id = ? AND (verified = 0 OR expires_at < NOW())`,
            [user.user_id]
        );

        // Generate cryptographically secure 6-digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await writeDb.query(
            `INSERT INTO gov_login_otp (user_id, otp_hash, expires_at, attempts, verified)
             VALUES (?, ?, ?, 0, 0)`,
            [user.user_id, otpHash, expiresAt]
        );

        // Record successful OTP generation to enforce resend cooldown & rate limits
        recordOtpRequest(cleanPhone, clientIp);

        // Report missing SMS integration clearly in console(for developer mode only)
        if(process.env.NODE_ENV !== "production"){
            console.log("\n========================================================");
            console.log(`🔑 [DEV ONLY] Government Portal OTP for mobile ${cleanPhone}: >>> ${otp} <<<`);
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
                message: "Please enter a 6-digit numeric OTP"
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
            `SELECT ud.user_id, ud.phone_number, ud.full_name,
                    au.user_id, au.username, au.role, au.permissions,
                    au.state_id, au.district_id, au.tehsil_id, au.status
             FROM userdetails ud
             JOIN app_users au ON ud.user_id = au.user_id
             WHERE ud.phone_number = ?`,
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
             FROM gov_login_otp
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
                `UPDATE gov_login_otp SET attempts = attempts + 1 WHERE otp_id = ?`,
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

        // Mark OTP as verified so it cannot be reused
        await writeDb.query(
            `UPDATE gov_login_otp SET verified = 1 WHERE otp_id = ?`,
            [otpRecord.otp_id]
        );

        // Reset failed verification count for this phone upon successful authentication
        recordSuccessfulVerification(cleanPhone, clientIp);

        let permissions = [];
        try {
            permissions = typeof user.permissions === "string"
                ? JSON.parse(user.permissions)
                : user.permissions;
        } catch (e) {
            permissions = [];
        }

        try {
            await LoginLogs.create({
                user_id: user.user_id,
                username: user.username,
                role: user.role
            });
        } catch (mongoErr) {
            console.error("MongoDB LoginLogs error:", mongoErr.message);
        }

        const jwtExpiry = process.env.JWT_EXPIRES_IN || "1d";
        const parseExpiryToMs = (expiry) => {
            if (typeof expiry === "number") return expiry * 1000;
            const match = String(expiry).match(/^(\d+)([smhd])$/);
            if (!match) return 24 * 60 * 60 * 1000;
            const val = parseInt(match[1], 10);
            switch (match[2]) {
                case "s": return val * 1000;
                case "m": return val * 60 * 1000;
                case "h": return val * 60 * 60 * 1000;
                case "d": return val * 24 * 60 * 60 * 1000;
                default: return 24 * 60 * 60 * 1000;
            }
        };

        const cookieMaxAge = parseExpiryToMs(jwtExpiry);

        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                role: user.role || "user",
                permissions: permissions,
                state_id: user.state_id,
                district_id: user.district_id,
                tehsil_id: user.tehsil_id,
                status: user.status
            },
            process.env.JWT_SECRET,
            { expiresIn: jwtExpiry }
        );

        res.cookie("gov_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: cookieMaxAge,
            path: "/"
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                user_id: user.user_id,
                username: user.username,
                full_name: user.full_name,
                phone_number: user.phone_number,
                role: user.role || "user",
                permissions: permissions,
                state_id: user.state_id,
                district_id: user.district_id,
                tehsil_id: user.tehsil_id,
                status: user.status
            }
        });
    } catch (error) {
        console.error("verifyOtp error:", error);
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
        const [rows] = await readDb.query(
            `SELECT 
                au.user_id,
                au.username,
                au.role,
                au.permissions,
                au.status,
                au.created_at,
                ud.full_name,
                ud.phone_number,
                ud.email,
                ud.address,
                ud.aadhaar_lookup,
                s.state_name,
                d.district_name,
                t.tehsil_name
             FROM app_users au
             LEFT JOIN userdetails ud ON au.user_id = ud.user_id
             LEFT JOIN state s ON au.state_id = s.state_id
             LEFT JOIN district d ON au.district_id = d.district_id
             LEFT JOIN tehsil t ON au.tehsil_id = t.tehsil_id
             WHERE au.user_id = ?`,
            [req.user.user_id]
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
                location: {
                    state: user.state_name || "All States (National)",
                    district: user.district_name || "All Districts",
                    tehsil: user.tehsil_name || "All Tehsils"
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
};

module.exports = {
    register,
    logout,
    getMe,
    requestOtp,
    verifyOtp,
    getProfile
};