const crypto = require("crypto");

/**
 * Dedicated In-Memory Server-Side Security Store for Payment Portal
 * 
 * Tracks:
 * - OTP request counts by normalized phone number
 * - OTP request counts by client IP address
 * - Failed OTP verification attempts
 * - Temporary lockout expiry timestamps
 * - OTP resend cooldown expiry timestamps (OTP_RESEND_COOLDOWN_MINUTES)
 * - Request-window start and expiry timestamps
 * 
 * Bounded & Expiry-Aware:
 * - Records are purged when expired
 * - Maximum entries limit prevents unbounded memory growth
 * - Phone numbers and IPs are hashed before keying
 * 
 * Known Limitation:
 * Map data is process-local. Backend restarts clear the counters,
 * and multiple backend instances maintain separate counters.
 */

const MAX_STORE_ENTRIES = 10000;
const IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour request window
const MAX_IP_OTP_REQUESTS_PER_WINDOW = 30; // Max requests per IP per window
const MAX_IP_FAILED_VERIFICATIONS = 50; // Max failed verifications before IP lockout
const MAX_PHONE_REQUESTS_PER_WINDOW = 10; // Max requests per phone per hour (after cooldown)

const securityStore = new Map();

/**
 * Validates required security configuration from process.env at backend startup.
 * Fails safely with a clear configuration error without exposing secrets.
 */
function validateSecurityConfig() {
    const maxAttemptsRaw = process.env.LOGIN_MAX_FAILED_ATTEMPTS;
    const lockoutHoursRaw = process.env.LOGIN_LOCKOUT_HOURS;
    const resendCooldownRaw = process.env.OTP_RESEND_COOLDOWN_MINUTES;

    if (maxAttemptsRaw === undefined || maxAttemptsRaw === null || String(maxAttemptsRaw).trim() === "") {
        throw new Error("Configuration Error: LOGIN_MAX_FAILED_ATTEMPTS must be configured in environment.");
    }
    if (lockoutHoursRaw === undefined || lockoutHoursRaw === null || String(lockoutHoursRaw).trim() === "") {
        throw new Error("Configuration Error: LOGIN_LOCKOUT_HOURS must be configured in environment.");
    }
    if (resendCooldownRaw === undefined || resendCooldownRaw === null || String(resendCooldownRaw).trim() === "") {
        throw new Error("Configuration Error: OTP_RESEND_COOLDOWN_MINUTES must be configured in environment.");
    }

    const maxAttempts = parseInt(maxAttemptsRaw, 10);
    const lockoutHours = parseFloat(lockoutHoursRaw);
    const resendCooldownMinutes = parseFloat(resendCooldownRaw);

    if (isNaN(maxAttempts) || maxAttempts <= 0) {
        throw new Error("Configuration Error: LOGIN_MAX_FAILED_ATTEMPTS must be a positive integer.");
    }
    if (isNaN(lockoutHours) || lockoutHours <= 0) {
        throw new Error("Configuration Error: LOGIN_LOCKOUT_HOURS must be a positive number.");
    }
    if (isNaN(resendCooldownMinutes) || resendCooldownMinutes <= 0) {
        throw new Error("Configuration Error: OTP_RESEND_COOLDOWN_MINUTES must be a positive number.");
    }

    return {
        maxAttempts,
        lockoutHours,
        resendCooldownMinutes
    };
}

/**
 * Retrieves current security configuration from environment variables.
 */
function getSecurityConfig() {
    return {
        maxAttempts: parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS, 10) || 5,
        lockoutHours: parseFloat(process.env.LOGIN_LOCKOUT_HOURS) || 2,
        resendCooldownMinutes: parseFloat(process.env.OTP_RESEND_COOLDOWN_MINUTES) || 5
    };
}

/**
 * Normalizes phone numbers to standard 10 digits.
 */
function normalizePhoneNumber(rawPhone) {
    if (!rawPhone) return null;
    let clean = String(rawPhone).trim().replace(/\D/g, "");
    if (clean.length === 12 && clean.startsWith("91")) {
        clean = clean.slice(2);
    }
    if (clean.length === 11 && clean.startsWith("0")) {
        clean = clean.slice(1);
    }
    if (clean.length === 10) {
        return clean;
    }
    return null;
}

/**
 * Safely extracts client IP address without blindly trusting headers.
 */
function getClientIp(req) {
    if (!req) return "127.0.0.1";
    let ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || "127.0.0.1";
    if (typeof ip === "string" && ip.startsWith("::ffff:")) {
        ip = ip.replace("::ffff:", "");
    }
    return ip;
}

/**
 * Hashes keys using SHA-256 to avoid storing plaintext phone numbers or IPs in memory.
 */
function getPhoneKey(phone) {
    const clean = normalizePhoneNumber(phone) || String(phone).trim();
    return "p:" + crypto.createHash("sha256").update(`phone:${clean}`).digest("hex");
}

function getIpKey(ip) {
    const clean = String(ip).trim();
    return "i:" + crypto.createHash("sha256").update(`ip:${clean}`).digest("hex");
}

/**
 * Enforces memory bounds by sweeping expired entries and evicting oldest if needed.
 */
function enforceBoundedStorage() {
    if (securityStore.size < MAX_STORE_ENTRIES) return;

    const now = Date.now();
    for (const [key, record] of securityStore.entries()) {
        if (record.expiresAt && record.expiresAt < now) {
            securityStore.delete(key);
        }
    }

    if (securityStore.size >= MAX_STORE_ENTRIES) {
        const deleteCount = Math.ceil(MAX_STORE_ENTRIES * 0.15); // free 15%
        let deleted = 0;
        for (const [key] of securityStore.entries()) {
            securityStore.delete(key);
            deleted++;
            if (deleted >= deleteCount) break;
        }
    }
}

/**
 * Background interval to purge expired records periodically.
 */
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of securityStore.entries()) {
        if (record.expiresAt && record.expiresAt < now) {
            securityStore.delete(key);
        }
    }
}, 10 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * Internal helper to get or initialize an entry.
 */
function getOrCreateRecord(key, defaultTtlMs = 60 * 60 * 1000) {
    const now = Date.now();
    let record = securityStore.get(key);
    if (!record) {
        enforceBoundedStorage();
        record = {
            failedAttempts: 0,
            lockoutUntil: 0,
            lastOtpRequestedAt: 0,
            otpRequestCount: 0,
            requestWindowStart: now,
            expiresAt: now + defaultTtlMs,
            lastAccessedAt: now
        };
        securityStore.set(key, record);
    } else {
        record.lastAccessedAt = now;
        if (record.lockoutUntil > 0 && record.lockoutUntil <= now) {
            record.lockoutUntil = 0;
            record.failedAttempts = 0;
        }
    }
    return record;
}

/**
 * Checks whether an OTP request is allowed for the given phone number and IP.
 */
function checkOtpRequestAllowed(rawPhone, ip) {
    const config = getSecurityConfig();
    const now = Date.now();

    // 1. Check IP-based lockout and flooding
    if (ip) {
        const ipRecord = securityStore.get(getIpKey(ip));
        if (ipRecord) {
            if (ipRecord.lockoutUntil > now) {
                const retryAfterSeconds = Math.ceil((ipRecord.lockoutUntil - now) / 1000);
                return {
                    allowed: false,
                    reason: "IP_LOCKED_OUT",
                    retryAfterSeconds
                };
            }
            if (now - ipRecord.requestWindowStart > IP_WINDOW_MS) {
                ipRecord.requestWindowStart = now;
                ipRecord.otpRequestCount = 0;
            } else if (ipRecord.otpRequestCount >= MAX_IP_OTP_REQUESTS_PER_WINDOW) {
                const retryAfterSeconds = Math.ceil((ipRecord.requestWindowStart + IP_WINDOW_MS - now) / 1000);
                return {
                    allowed: false,
                    reason: "IP_RATE_LIMITED",
                    retryAfterSeconds
                };
            }
        }
    }

    // 2. Check Phone-based lockout, cooldown, and flooding
    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (cleanPhone) {
        const phoneRecord = securityStore.get(getPhoneKey(cleanPhone));
        if (phoneRecord) {
            if (phoneRecord.lockoutUntil > now) {
                const retryAfterSeconds = Math.ceil((phoneRecord.lockoutUntil - now) / 1000);
                return {
                    allowed: false,
                    reason: "PHONE_LOCKED_OUT",
                    retryAfterSeconds
                };
            }

            const cooldownMs = config.resendCooldownMinutes * 60 * 1000;
            if (phoneRecord.lastOtpRequestedAt && (now - phoneRecord.lastOtpRequestedAt < cooldownMs)) {
                const waitSeconds = Math.ceil((cooldownMs - (now - phoneRecord.lastOtpRequestedAt)) / 1000);
                return {
                    allowed: false,
                    reason: "COOLDOWN",
                    retryAfterSeconds: waitSeconds
                };
            }

            if (now - phoneRecord.requestWindowStart > IP_WINDOW_MS) {
                phoneRecord.requestWindowStart = now;
                phoneRecord.otpRequestCount = 0;
            } else if (phoneRecord.otpRequestCount >= MAX_PHONE_REQUESTS_PER_WINDOW) {
                const retryAfterSeconds = Math.ceil((phoneRecord.requestWindowStart + IP_WINDOW_MS - now) / 1000);
                return {
                    allowed: false,
                    reason: "PHONE_RATE_LIMITED",
                    retryAfterSeconds
                };
            }
        }
    }

    return { allowed: true };
}

/**
 * Records an OTP generation/request event for the phone and IP.
 */
function recordOtpRequest(rawPhone, ip) {
    const config = getSecurityConfig();
    const now = Date.now();
    const phoneTtl = Math.max(24 * 60 * 60 * 1000, config.lockoutHours * 60 * 60 * 1000);

    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (cleanPhone) {
        const phoneRecord = getOrCreateRecord(getPhoneKey(cleanPhone), phoneTtl);
        phoneRecord.lastOtpRequestedAt = now;
        phoneRecord.otpRequestCount++;
        phoneRecord.expiresAt = Math.max(
            phoneRecord.expiresAt,
            now + config.resendCooldownMinutes * 60 * 1000 + 60 * 1000
        );
    }

    if (ip) {
        const ipRecord = getOrCreateRecord(getIpKey(ip), IP_WINDOW_MS);
        ipRecord.otpRequestCount++;
        ipRecord.expiresAt = Math.max(ipRecord.expiresAt, ipRecord.requestWindowStart + IP_WINDOW_MS);
    }
}

/**
 * Checks whether an OTP verification attempt is allowed.
 */
function checkVerificationAllowed(rawPhone, ip) {
    const now = Date.now();

    if (ip) {
        const ipRecord = securityStore.get(getIpKey(ip));
        if (ipRecord && ipRecord.lockoutUntil > now) {
            return {
                allowed: false,
                reason: "IP_LOCKED_OUT",
                retryAfterSeconds: Math.ceil((ipRecord.lockoutUntil - now) / 1000)
            };
        }
    }

    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (cleanPhone) {
        const phoneRecord = securityStore.get(getPhoneKey(cleanPhone));
        if (phoneRecord && phoneRecord.lockoutUntil > now) {
            return {
                allowed: false,
                reason: "PHONE_LOCKED_OUT",
                retryAfterSeconds: Math.ceil((phoneRecord.lockoutUntil - now) / 1000)
            };
        }
    }

    return { allowed: true };
}

/**
 * Records a failed verification attempt.
 */
function recordFailedVerification(rawPhone, ip) {
    const config = getSecurityConfig();
    const now = Date.now();
    const lockoutMs = config.lockoutHours * 60 * 60 * 1000;
    const ttl = Math.max(lockoutMs * 2, 24 * 60 * 60 * 1000);

    let isLockedOut = false;
    let retryAfterSeconds = 0;

    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (cleanPhone) {
        const phoneRecord = getOrCreateRecord(getPhoneKey(cleanPhone), ttl);
        phoneRecord.failedAttempts++;

        if (phoneRecord.failedAttempts >= config.maxAttempts) {
            phoneRecord.lockoutUntil = now + lockoutMs;
            phoneRecord.expiresAt = phoneRecord.lockoutUntil + 60 * 1000;
            isLockedOut = true;
            retryAfterSeconds = Math.ceil(lockoutMs / 1000);
            console.warn(`[Security Store] Phone lockout activated: ${phoneRecord.failedAttempts} failed attempts reached threshold of ${config.maxAttempts}. Locked for ${config.lockoutHours} hour(s).`);
        }
    }

    if (ip) {
        const ipRecord = getOrCreateRecord(getIpKey(ip), ttl);
        ipRecord.failedAttempts++;

        if (ipRecord.failedAttempts >= MAX_IP_FAILED_VERIFICATIONS) {
            ipRecord.lockoutUntil = now + lockoutMs;
            ipRecord.expiresAt = ipRecord.lockoutUntil + 60 * 1000;
            isLockedOut = true;
            retryAfterSeconds = Math.max(retryAfterSeconds, Math.ceil(lockoutMs / 1000));
            console.warn(`[Security Store] IP lockout activated: ${ipRecord.failedAttempts} failed attempts from IP. Locked for ${config.lockoutHours} hour(s).`);
        }
    }

    return {
        isLockedOut,
        retryAfterSeconds
    };
}

/**
 * Resets failed verification counters for the authenticated phone number upon successful verification.
 */
function recordSuccessfulVerification(rawPhone, ip) {
    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (cleanPhone) {
        const phoneRecord = securityStore.get(getPhoneKey(cleanPhone));
        if (phoneRecord) {
            phoneRecord.failedAttempts = 0;
            phoneRecord.lockoutUntil = 0;
        }
    }
}

function getStoreStats() {
    return {
        totalEntries: securityStore.size,
        maxEntries: MAX_STORE_ENTRIES
    };
}

function resetStore() {
    securityStore.clear();
}

module.exports = {
    validateSecurityConfig,
    getSecurityConfig,
    normalizePhoneNumber,
    getClientIp,
    checkOtpRequestAllowed,
    recordOtpRequest,
    checkVerificationAllowed,
    recordFailedVerification,
    recordSuccessfulVerification,
    getStoreStats,
    resetStore
};
