const crypto = require("crypto");

const MAX_STORE_ENTRIES = 10000;
const IP_WINDOW_MS = 60 * 60 * 1000; 
const MAX_IP_OTP_REQUESTS_PER_WINDOW = 30; 
const MAX_IP_FAILED_VERIFICATIONS = 50; 
const MAX_PHONE_REQUESTS_PER_WINDOW = 10; 

const securityStore = new Map();

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

function getSecurityConfig() {
    return {
        maxAttempts: parseInt(process.env.LOGIN_MAX_FAILED_ATTEMPTS, 10) || 5,
        lockoutHours: parseFloat(process.env.LOGIN_LOCKOUT_HOURS) || 2,
        resendCooldownMinutes: parseFloat(process.env.OTP_RESEND_COOLDOWN_MINUTES) || 5
    };
}

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

function getClientIp(req) {
    if (!req) return "127.0.0.1";
    let ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || "127.0.0.1";
    if (typeof ip === "string" && ip.startsWith("::ffff:")) {
        ip = ip.replace("::ffff:", "");
    }
    return ip;
}

function getPhoneKey(phone) {
    const clean = normalizePhoneNumber(phone) || String(phone).trim();
    return "p:" + crypto.createHash("sha256").update(`phone:${clean}`).digest("hex");
}

function getIpKey(ip) {
    const clean = String(ip).trim();
    return "i:" + crypto.createHash("sha256").update(`ip:${clean}`).digest("hex");
}

function enforceBoundedStorage() {
    if (securityStore.size < MAX_STORE_ENTRIES) return;

    const now = Date.now();
    for (const [key, record] of securityStore.entries()) {
        if (record.expiresAt && record.expiresAt < now) {
            securityStore.delete(key);
        }
    }

    if (securityStore.size >= MAX_STORE_ENTRIES) {
        const deleteCount = Math.ceil(MAX_STORE_ENTRIES * 0.15); 
        let deleted = 0;
        for (const [key] of securityStore.entries()) {
            securityStore.delete(key);
            deleted++;
            if (deleted >= deleteCount) break;
        }
    }
}

const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of securityStore.entries()) {
        if (record.expiresAt && record.expiresAt < now) {
            securityStore.delete(key);
        }
    }
}, 10 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

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

function checkOtpRequestAllowed(rawPhone, ip) {
    const config = getSecurityConfig();
    const now = Date.now();

    if (ip) {
        const ipRecord = securityStore.get(getIpKey(ip));
        if (ipRecord) {
            if (ipRecord.lockoutUntil > 0 && ipRecord.lockoutUntil <= now) {
                ipRecord.lockoutUntil = 0;
                ipRecord.failedAttempts = 0;
            }
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

    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (cleanPhone) {
        const phoneRecord = securityStore.get(getPhoneKey(cleanPhone));
        if (phoneRecord) {
            if (phoneRecord.lockoutUntil > 0 && phoneRecord.lockoutUntil <= now) {
                phoneRecord.lockoutUntil = 0;
                phoneRecord.failedAttempts = 0;
            }
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

function checkVerificationAllowed(rawPhone, ip) {
    const now = Date.now();

    if (ip) {
        const ipRecord = securityStore.get(getIpKey(ip));
        if (ipRecord) {
            if (ipRecord.lockoutUntil > 0 && ipRecord.lockoutUntil <= now) {
                ipRecord.lockoutUntil = 0;
                ipRecord.failedAttempts = 0;
            }
            if (ipRecord.lockoutUntil > now) {
                return {
                    allowed: false,
                    reason: "IP_LOCKED_OUT",
                    retryAfterSeconds: Math.ceil((ipRecord.lockoutUntil - now) / 1000)
                };
            }
        }
    }

    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (cleanPhone) {
        const phoneRecord = securityStore.get(getPhoneKey(cleanPhone));
        if (phoneRecord) {
            if (phoneRecord.lockoutUntil > 0 && phoneRecord.lockoutUntil <= now) {
                phoneRecord.lockoutUntil = 0;
                phoneRecord.failedAttempts = 0;
            }
            if (phoneRecord.lockoutUntil > now) {
                return {
                    allowed: false,
                    reason: "PHONE_LOCKED_OUT",
                    retryAfterSeconds: Math.ceil((phoneRecord.lockoutUntil - now) / 1000)
                };
            }
        }
    }

    return { allowed: true };
}

function recordFailedVerification(rawPhone, ip) {
    const config = getSecurityConfig();
    const now = Date.now();
    const lockoutMs = config.lockoutHours * 60 * 60 * 1000;
    const ttl = Math.max(lockoutMs * 2, 24 * 60 * 60 * 1000);

    let isLockedOut = false;
    let retryAfterSeconds = 0;
    let remainingAttempts = config.maxAttempts;

    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (cleanPhone) {
        const phoneRecord = getOrCreateRecord(getPhoneKey(cleanPhone), ttl);
        phoneRecord.failedAttempts++;
        remainingAttempts = Math.max(0, config.maxAttempts - phoneRecord.failedAttempts);

        if (phoneRecord.failedAttempts >= config.maxAttempts) {
            phoneRecord.lockoutUntil = now + lockoutMs;
            phoneRecord.expiresAt = phoneRecord.lockoutUntil + 60 * 1000;
            isLockedOut = true;
            retryAfterSeconds = Math.ceil(lockoutMs / 1000);
            remainingAttempts = 0;
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
            remainingAttempts = 0;
        }
    }

    return {
        isLockedOut,
        retryAfterSeconds,
        remainingAttempts,
        maxAttempts: config.maxAttempts
    };
}

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
