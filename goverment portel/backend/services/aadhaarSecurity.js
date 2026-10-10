const crypto = require("crypto");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 12;

function getAadhaarPepper() {
    const pepper = process.env.AADHAAR_PEPPER;
    if (!pepper || typeof pepper !== "string" || !pepper.trim()) {
        throw new Error("Configuration error: AADHAAR_PEPPER environment variable is missing.");
    }
    return pepper.trim();
}

function isValidAadhaar(aadhaar) {
    if (!aadhaar) return false;
    const clean = String(aadhaar).trim();
    return /^\d{12}$/.test(clean);
}

function generateAadhaarLookup(aadhaar) {
    if (!aadhaar) {
        throw new Error("Aadhaar number is required to generate lookup hash");
    }
    const clean = String(aadhaar).trim();
    const pepper = getAadhaarPepper();
    return crypto
        .createHmac("sha256", pepper)
        .update(clean)
        .digest("hex");
}

async function generateAadhaarHash(aadhaar) {
    if (!aadhaar) {
        throw new Error("Aadhaar number is required to generate hash");
    }
    const clean = String(aadhaar).trim();
    return await bcrypt.hash(clean, BCRYPT_ROUNDS);
}

async function verifyAadhaar(aadhaar, hash) {
    if (!aadhaar || !hash) return false;
    const clean = String(aadhaar).trim();
    return await bcrypt.compare(clean, hash);
}

module.exports = {
    getAadhaarPepper,
    isValidAadhaar,
    generateAadhaarLookup,
    generateAadhaarHash,
    verifyAadhaar
};
