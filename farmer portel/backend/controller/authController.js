const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getWriteDatabase, getReadDatabase } = require("../database/databaserouter");
const {
    getClientIp,
    normalizePhoneNumber,
    checkOtpRequestAllowed,
    recordOtpRequest,
    checkVerificationAllowed,
    recordFailedVerification,
    recordSuccessfulVerification
} = require("../services/securityStore");

const getSecurityMaxAttempts = () => parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS, 10) || 5;
const OTP_EXPIRY_MINUTES = 5;

const isValidAadhaar = (aadhaar) => {
    if (!aadhaar) return false;
    const clean = String(aadhaar).trim();
    return /^\d{12}$/.test(clean);
};

const isValidMobile = (mobile) => {
    if (!mobile) return false;
    const clean = String(mobile).trim();
    return /^\d{10}$/.test(clean);
};

const requestOtp = async (req, res) => {
    try {
        const clientIp = getClientIp(req);
        const rawMobile = req.body.phone_number || req.body.mobile;
        const aadhaar = req.body.aadhaar;

        if (!isValidAadhaar(aadhaar) || !isValidMobile(rawMobile)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Aadhaar or mobile number"
            });
        }

        const cleanAadhaar = String(aadhaar).trim();
        const cleanMobile = normalizePhoneNumber(rawMobile);

        if (!cleanMobile) {
            return res.status(400).json({
                success: false,
                message: "Invalid Aadhaar or mobile number"
            });
        }

        const allowedCheck = checkOtpRequestAllowed(cleanMobile, clientIp);
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
        const [farmers] = await readDb.query(
            "SELECT farmer_id, name, mobile_number, aadhaar_hash, aadhaar_lookup, status FROM farmer WHERE mobile_number = ?",
            [cleanMobile]
        );

        if (farmers.length === 0) {
            recordOtpRequest(cleanMobile, clientIp);
            return res.status(400).json({
                success: false,
                message: "Invalid Aadhaar or mobile number"
            });
        }

        const farmer = farmers[0];

        if (farmer.status && farmer.status !== "active") {
            recordOtpRequest(cleanMobile, clientIp);
            return res.status(403).json({
                success: false,
                message: "Farmer account is not active"
            });
        }

        const aadhaarPepper = process.env.AADHAAR_PEPPER;
        if (!aadhaarPepper) {
            console.error("[CRITICAL CONFIG ERROR] AADHAAR_PEPPER is not configured.");
            return res.status(500).json({
                success: false,
                message: "Authentication service configuration error"
            });
        }
        const computedLookup = crypto
            .createHmac("sha256", aadhaarPepper)
            .update(cleanAadhaar)
            .digest("hex");

        let isAadhaarMatch = (farmer.aadhaar_lookup && farmer.aadhaar_lookup === computedLookup);
        if (!isAadhaarMatch && farmer.aadhaar_hash) {
            isAadhaarMatch = await bcrypt.compare(cleanAadhaar, farmer.aadhaar_hash);
        }

        if (!isAadhaarMatch) {
            recordOtpRequest(cleanMobile, clientIp);
            return res.status(400).json({
                success: false,
                message: "Invalid Aadhaar or mobile number"
            });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();

        const otpHash = await bcrypt.hash(otp, 10);

        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const writeDb = getWriteDatabase().promise();
        await writeDb.query(
            "INSERT INTO farmer_login_otp (farmer_id, otp_hash, expires_at, attempts, verified) VALUES (?, ?, ?, 0, FALSE)",
            [farmer.farmer_id, otpHash, expiresAt]
        );

        recordOtpRequest(cleanMobile, clientIp);

        const maxAttempts = getSecurityMaxAttempts();
        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            max_attempts: maxAttempts,
            remaining_attempts: maxAttempts,
            resend_cooldown: 5 * 60,
            otp: otp
        });
    } catch (error) {
        console.error("Error in requestOtp:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const clientIp = getClientIp(req);
        const rawMobile = req.body.phone_number || req.body.mobile;
        const aadhaar = req.body.aadhaar;
        const otp = req.body.otp;

        if (!aadhaar || !rawMobile || !otp) {
            return res.status(400).json({
                success: false,
                message: "Aadhaar, mobile, and OTP are required"
            });
        }

        if (!isValidAadhaar(aadhaar) || !isValidMobile(rawMobile)) {
            return res.status(400).json({
                success: false,
                message: "Invalid Aadhaar or mobile number"
            });
        }

        const cleanAadhaar = String(aadhaar).trim();
        const cleanMobile = normalizePhoneNumber(rawMobile);
        const cleanOtp = String(otp).trim();

        if (!cleanMobile || !/^\d{6}$/.test(cleanOtp)) {
            return res.status(400).json({
                success: false,
                message: "Unable to verify the OTP. Please check the code and try again."
            });
        }

        const verifyAllowed = checkVerificationAllowed(cleanMobile, clientIp);
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

        const writeDb = getWriteDatabase().promise();
        const [farmers] = await writeDb.query(
            "SELECT farmer_id, name, mobile_number, aadhaar_hash, aadhaar_lookup, status FROM farmer WHERE mobile_number = ?",
            [cleanMobile]
        );

        if (farmers.length === 0) {
            const failResult = recordFailedVerification(cleanMobile, clientIp);
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

        const farmer = farmers[0];

        if (farmer.status && farmer.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Farmer account is not active"
            });
        }

        const aadhaarPepper = process.env.AADHAAR_PEPPER;
        if (!aadhaarPepper) {
            console.error("[CRITICAL CONFIG ERROR] AADHAAR_PEPPER is not configured.");
            return res.status(500).json({
                success: false,
                message: "Authentication service configuration error"
            });
        }
        const computedLookup = crypto
            .createHmac("sha256", aadhaarPepper)
            .update(cleanAadhaar)
            .digest("hex");

        let isAadhaarMatch = (farmer.aadhaar_lookup && farmer.aadhaar_lookup === computedLookup);
        if (!isAadhaarMatch && farmer.aadhaar_hash) {
            isAadhaarMatch = await bcrypt.compare(cleanAadhaar, farmer.aadhaar_hash);
        }

        if (!isAadhaarMatch) {
            const failResult = recordFailedVerification(cleanMobile, clientIp);
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

        const [otpRecords] = await writeDb.query(
            "SELECT otp_id, farmer_id, otp_hash, expires_at, attempts, verified FROM farmer_login_otp WHERE farmer_id = ? ORDER BY otp_id DESC LIMIT 1",
            [farmer.farmer_id]
        );

        if (otpRecords.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Unable to verify the OTP. Please check the code and try again."
            });
        }

        const otpRecord = otpRecords[0];
        const now = new Date();
        const maxAttempts = getSecurityMaxAttempts();

        if (otpRecord.verified) {
            const isOtpMatch = await bcrypt.compare(cleanOtp, otpRecord.otp_hash);
            if (isOtpMatch && now < new Date(otpRecord.expires_at)) {
                const token = jwt.sign(
                    { farmer_id: farmer.farmer_id },
                    process.env.JWT_SECRET,
                    { expiresIn: "24h" }
                );

                const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
                const isProduction = process.env.NODE_ENV === "production";
                const useSecure = Boolean(isProduction && isHttps);

                const cookieOptions = {
                    httpOnly: true,
                    secure: useSecure,
                    sameSite: useSecure ? "none" : "lax",
                    path: "/",
                    maxAge: 24 * 60 * 60 * 1000
                };
                res.cookie("token", token, cookieOptions);
                res.cookie("farmer_token", token, cookieOptions);

                return res.status(200).json({
                    success: true,
                    message: "Login successful",
                    farmer: {
                        farmer_id: farmer.farmer_id,
                        name: farmer.name
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
            const failResult = recordFailedVerification(cleanMobile, clientIp);
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

        const isOtpMatch = await bcrypt.compare(cleanOtp, otpRecord.otp_hash);

        if (!isOtpMatch) {
            const nextAttempts = otpRecord.attempts + 1;
            await writeDb.query(
                "UPDATE farmer_login_otp SET attempts = ? WHERE otp_id = ?",
                [nextAttempts, otpRecord.otp_id]
            );

            const failResult = recordFailedVerification(cleanMobile, clientIp);
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
            "UPDATE farmer_login_otp SET verified = TRUE WHERE otp_id = ?",
            [otpRecord.otp_id]
        );

        recordSuccessfulVerification(cleanMobile, clientIp);

        const [verifyRows] = await writeDb.query(
            `SELECT f.farmer_id, f.status, f.mobile_verified, f.verification_status AS farmer_verified,
                    COALESCE(b.verification_status, 0) AS bank_verified
             FROM farmer f
             LEFT JOIN bank_account b ON f.farmer_id = b.farmer_id
             WHERE f.farmer_id = ?`,
            [farmer.farmer_id]
        );

        if (verifyRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer record not found"
            });
        }

        const vData = verifyRows[0];
        const isMobileVerified = Boolean(vData.mobile_verified);
        const isBankVerified = Boolean(vData.bank_verified);
        const isFarmerVerified = Boolean(vData.farmer_verified);
        const isAccountActive = vData.status === "active";

        if (!isAccountActive) {
            return res.status(403).json({
                success: false,
                message: "Farmer account is inactive or suspended. Please contact your Tehsil/Mandi administration."
            });
        }

        if (!isMobileVerified || !isBankVerified || !isFarmerVerified) {
            return res.status(403).json({
                success: false,
                message: "Account verification pending. Please ensure your mobile number, bank account, and farmer profile are fully verified before accessing the Farmer Portal.",
                verification_details: {
                    mobile_verified: isMobileVerified,
                    bank_verified: isBankVerified,
                    profile_verified: isFarmerVerified
                }
            });
        }

        const token = jwt.sign(
            { farmer_id: farmer.farmer_id },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
        const isProduction = process.env.NODE_ENV === "production";
        const useSecure = Boolean(isProduction && isHttps);

        const cookieOptions = {
            httpOnly: true,
            secure: useSecure,
            sameSite: useSecure ? "none" : "lax",
            path: "/",
            maxAge: 24 * 60 * 60 * 1000
        };
        res.cookie("token", token, cookieOptions);
        res.cookie("farmer_token", token, cookieOptions);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            farmer: {
                farmer_id: farmer.farmer_id,
                name: farmer.name
            }
        });
    } catch (error) {
        console.error("Error in verifyOtp:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const logout = async (req, res) => {
    try {
        const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
        const isProduction = process.env.NODE_ENV === "production";
        const useSecure = Boolean(isProduction && isHttps);

        const clearOptions = {
            httpOnly: true,
            secure: useSecure,
            sameSite: useSecure ? "none" : "lax",
            path: "/"
        };
        res.clearCookie("token", clearOptions);
        res.clearCookie("farmer_token", clearOptions);

        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        console.error("Error in logout:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

const getMe = async (req, res) => {
    try {
        const farmerId = req.user.farmer_id;

        const readDb = getReadDatabase().promise();
        const [farmers] = await readDb.query(
            `SELECT f.farmer_id, f.name, f.mobile_number, f.email, f.address, f.status,
                    f.mobile_verified, f.verification_status AS farmer_verified, f.registration_date,
                    s.state_name, d.district_name, t.tehsil_name,
                    COALESCE(b.verification_status, 0) AS bank_verified
             FROM farmer f
             LEFT JOIN state s ON f.state_id = s.state_id
             LEFT JOIN district d ON f.district_id = d.district_id
             LEFT JOIN tehsil t ON f.tehsil_id = t.tehsil_id
             LEFT JOIN bank_account b ON f.farmer_id = b.farmer_id
             WHERE f.farmer_id = ?`,
            [farmerId]
        );

        if (farmers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Farmer not found"
            });
        }

        const farmer = farmers[0];
        const isMobileVerified = Boolean(farmer.mobile_verified);
        const isBankVerified = Boolean(farmer.bank_verified);
        const isFarmerVerified = Boolean(farmer.farmer_verified);
        const isAccountActive = farmer.status === "active";

        if (!isAccountActive || !isMobileVerified || !isBankVerified || !isFarmerVerified) {
            const isProduction = process.env.NODE_ENV === "production";
            const clearOptions = {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? "none" : "lax",
                path: "/"
            };
            res.clearCookie("farmer_token", clearOptions);
            res.clearCookie("token", clearOptions);
            return res.status(403).json({
                success: false,
                authenticated: false,
                message: "Account verification pending. Please complete all verification steps before accessing the Farmer Portal."
            });
        }

        return res.status(200).json({
            success: true,
            authenticated: true,
            farmer
        });
    } catch (error) {
        console.error("Error in getMe:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

module.exports = {
    requestOtp,
    verifyOtp,
    logout,
    getMe
};
