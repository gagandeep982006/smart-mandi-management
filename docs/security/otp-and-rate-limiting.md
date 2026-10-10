# OTP Abuse Protection & Rate Limiting

Login endpoints and OTP generation routes are protected against brute-force attacks, phone number harvesting, and SMS gateway exhaustion using a dedicated server-side in-memory JavaScript `Map` store (`services/securityStore.js`).

---

## 1. Architectural Design

Rather than requiring an external caching dependency (such as Redis), the security store uses process-local memory:
- **Bounded Capacity**: Bounded to 10,000 entries with automatic Least Recently Used (LRU) / FIFO eviction when full.
- **SHA-256 Hashing of Keys**: Phone numbers and IP addresses are hashed using SHA-256 before being used as Map keys, ensuring personal citizen identifiers are not stored in memory in plaintext.
- **Process Lifecycle**: The in-memory Map is maintained entirely within the Node.js process. Restarting the backend process resets all rate-limiting buckets.

---

## 2. Configuration & Startup Validation

Each portal validates security settings at backend startup via `validateSecurityConfig()`:

```env
# Maximum failed attempts before temporary lockout
LOGIN_MAX_FAILED_ATTEMPTS=5

# Lockout duration in hours once maximum failed attempts is reached
LOGIN_LOCKOUT_HOURS=2

# Minimum cooldown between successive OTP generation requests
OTP_RESEND_COOLDOWN_MINUTES=5
```

If any variable is missing or is not a positive integer, the backend process logs a fatal configuration error and aborts startup immediately to prevent running without rate-limiting defenses.

---

## 3. Rate Limiting Rules & Thresholds

### A. 5-Minute OTP Resend Cooldown
- When a user requests an OTP via `/api/auth/request-otp`, the timestamp is recorded.
- Subsequent requests for the same phone number or IP address within `OTP_RESEND_COOLDOWN_MINUTES` (5 minutes) are rejected immediately with HTTP 429:
  ```json
  {
    "success": false,
    "message": "Too many requests. Please try again later."
  }
  ```
- The cooldown check executes entirely in memory without performing database queries.

### B. Failed Verification Lockout
- When an incorrect OTP is submitted via `/api/auth/verify-otp`, a failure counter is incremented.
- Once failures reach `LOGIN_MAX_FAILED_ATTEMPTS` (5 consecutive failures), the account is locked for `LOGIN_LOCKOUT_HOURS` (2 hours).
- During the lockout window, any further verification requests return HTTP 429.
- A single successful verification resets the failure counter to zero.

### C. Generic Security Responses
To prevent username enumeration or attempt guessing:
- Failure messages never disclose remaining attempts (e.g. `"2 attempts left"`).
- Verification failures return generic HTTP 400: `"Unable to verify the OTP. Please check the code and try again."`
- Rate-limit triggers return generic HTTP 429: `"Too many requests. Please try again later."`
