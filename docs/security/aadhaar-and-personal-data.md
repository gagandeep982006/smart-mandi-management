# Aadhaar & Personal Data Protection

The Indian Aadhaar Act and statutory privacy regulations prohibit storing citizen 12-digit Aadhaar numbers in plaintext in public or private databases. This document describes the two-tier cryptographic mechanism implemented across the platform to ensure regulatory compliance while enabling exact duplicate detection and verification.

---

## 1. Two-Tier Cryptographic Architecture

```mermaid
flowchart TD
    RawAadhaar["12-Digit Raw Aadhaar Input"] --> Clean["Sanitize (12 Digits Only)"]
    
    Clean -->|HMAC-SHA256 + AADHAAR_PEPPER| BlindIndex["aadhaar_lookup (64-char Hex)"]
    Clean -->|bcrypt.hash(saltRounds=10)| StorageHash["aadhaar_hash (60-char String)"]

    BlindIndex -->|Stored in MySQL UNIQUE column| DBIndex[("farmer.aadhaar_lookup")]
    StorageHash -->|Stored in MySQL for verification| DBHash[("farmer.aadhaar_hash")]
```

---

## 2. Tier 1: Blind Index Lookup (`aadhaar_lookup`)

To prevent duplicate farmer registrations and verify returning farmers, the application requires exact $O(1)$ lookups without storing the Aadhaar number.

### Implementation (`services/aadhaarSecurity.js`):
```javascript
function generateAadhaarLookup(aadhaarNumber) {
    const pepper = process.env.AADHAAR_PEPPER;
    if (!pepper) {
        throw new Error("CONFIGURATION ERROR: AADHAAR_PEPPER is missing.");
    }
    return crypto.createHmac("sha256", pepper)
                 .update(String(aadhaarNumber).trim())
                 .digest("hex");
}
```

- **Algorithm**: `HMAC-SHA256` keyed by an isolated server-side secret (`AADHAAR_PEPPER`).
- **Deterministic**: The same Aadhaar number always yields the exact same 64-character hexadecimal digest.
- **Irreversible**: An attacker with read access to the database cannot reverse the 64-character hash to recover the 12-digit Aadhaar number without possessing the pepper secret.
- **Unique Constraint**: The database creates `UNIQUE KEY (aadhaar_lookup)` to guarantee that no farmer or user can register twice with the same Aadhaar.

---

## 3. Tier 2: Irreversible Verification Hash (`aadhaar_hash`)

- **Algorithm**: `bcrypt` hash with high work factor salt rounds.
- **Salted**: Non-deterministic (each hash contains a distinct random salt).
- **Purpose**: Used for high-security secondary identity verification if required during dispute resolution.

---

## 4. Personal Identifiable Information (PII) Safeguards

1. **No Plaintext Storage**: Raw 12-digit Aadhaar numbers are never written to MySQL tables, MongoDB audit documents, or server log files.
2. **Strict Pepper Configuration**: Backend boot validates that `process.env.AADHAAR_PEPPER` is configured. If missing, the server logs a configuration error and refuses to process Aadhaar operations.
3. **Phone Number Masking**: In public dashboard views, citizen phone numbers can be masked (`XXXXXX1234`) to protect personal contact information.
