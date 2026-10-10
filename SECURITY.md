# Security Policy

## 1. Supported Portals & Versions

Security updates and vulnerability remediation are actively maintained for the core platform:

| Portal | Role | Supported Status |
|---|---|---|
| **Government Portal** | Administrative & LBAC Configuration | Supported |
| **Mandi Portal** | Operational Market Yard & Weighbridge | Supported |
| **Farmer Portal** | Self-Service Slot Booking & Quotas | Supported |
| **Payment Portal** | State-Isolated MSP Disbursement | Supported |
| **Home Hub** | Central Navigation Gateway | Supported |

---

## 2. Core Security Controls Implemented

- **HttpOnly JWT Session Storage**: Prevents JavaScript token theft via Cross-Site Scripting (XSS).
- **Portal-Isolated Cookie Scoping**: Dedicated cookie names (`gov_token`, `mandi_token`, `farmer_token`, `payment_token`) prevent cross-portal token leakage on localhost and shared domains.
- **Two-Tier Aadhaar Protection**: Blind index hashing (`HMAC-SHA256`) with isolated high-entropy pepper (`AADHAAR_PEPPER`) for lookup, and `bcrypt` hashing for permanent storage. Plaintext Aadhaar is never persisted.
- **Server-Side In-Memory Rate Limiting**: Bounded JavaScript `Map` tracks failed attempts (`LOGIN_MAX_FAILED_ATTEMPTS`) and enforces lockout (`LOGIN_LOCKOUT_HOURS`) and OTP resend cooldowns (`OTP_RESEND_COOLDOWN_MINUTES`).
- **Location-Based Access Control (LBAC)**: Hierarchical filtering (`State` &rarr; `District` &rarr; `Tehsil`) ensures officers can only view or mutate records in their authorized jurisdiction.
- **Strict Foreign Key Constraints**: Enforces `ON DELETE RESTRICT` on financial disbursements, booking allocations, and crop quotas to prevent accidental loss or orphaned transactions.

---

## 3. Reporting a Vulnerability

If you discover a potential security vulnerability within this repository:

1. **Do NOT open a public GitHub issue** describing the vulnerability.
2. Prepare a detailed vulnerability report including:
   - Affected portal and endpoint/component.
   - Step-by-step reproduction instructions.
   - Proof of Concept (PoC) if applicable.
   - Potential impact on data confidentiality or system integrity.
3. Submit the report privately to the repository maintainers or designated security point of contact.
4. Maintainers will review the report, verify the issue, and provide a patch within a responsible disclosure timeframe.

---

## 4. Responsible Disclosure Guidelines

- Never access, download, or modify real user or citizen data during security evaluation.
- Test only against local development environments using dummy mock data.
- Avoid Denial of Service (DoS) attacks on active infrastructure.
