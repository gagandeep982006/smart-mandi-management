# Architecture Decision Records (ADRs)

This document captures key architectural decisions made in the codebase, detailing the context, alternatives considered, chosen approach, and operational consequences.

---

## ADR 001: Shared Database Topology vs Synchronous Microservices

### Context
The platform coordinates actions between government administrative setup, mandi yard operations, farmer bookings, and payments. Each portal needs access to commodity prices, mandi details, counter lines, and booking states.

### Decision
Utilize a shared MySQL relational database (`farmer_db`) and MongoDB instance (`farmer_history`) rather than dividing the data model into disjoint microservice databases communicating via synchronous HTTP/gRPC.

### Consequences
- **Positive**:
  - Direct relational joins across tables enable high-performance MySQL views (`vw_payment_details`, `vw_booking_queue`, `vw_mandis`).
  - Database-enforced constraints (`ON DELETE RESTRICT`) prevent orphaned payments and invalid tokens.
  - No distributed transactions or sagas required for booking and payment state updates.
- **Negative / Trade-offs**:
  - Schema modifications require careful coordination across all four portal backends.
  - Backends share connection pool capacity on the Primary database.

---

## ADR 002: HttpOnly JWT Cookies vs Authorization Header Storage

### Context
Web clients authenticate users across government officers, mandi staff, farmers, and payment officers. Tokens must be stored securely against script injection attacks.

### Decision
Store JSON Web Tokens (JWT) strictly inside `HttpOnly`, `SameSite: "lax"` cookies rather than returning tokens in JSON bodies for storage in `localStorage` or `sessionStorage`.

### Consequences
- **Positive**:
  - Client-side JavaScript cannot read `document.cookie`, preventing token exfiltration via Cross-Site Scripting (XSS).
  - Browsers automatically attach cookies to same-site and CORS credentials requests (`credentials: "include"`).
- **Negative / Trade-offs**:
  - Cross-Origin Resource Sharing (CORS) must explicitly configure `origin` (no wildcards `*` allowed) and `credentials: true`.
  - Dedicated cookie names (`gov_token`, `mandi_token`, `farmer_token`, `payment_token`) are required to prevent token collision on `localhost`.

---

## ADR 003: Server-Side In-Memory Rate Limiting (`Map`) vs Redis

### Context
Login endpoints and OTP generation routes require abuse protection to prevent brute force attacks, credential stuffing, and SMS gateway spam.

### Decision
Implement rate limiting, lockout counters, and OTP cooldowns using dedicated, process-local JavaScript `Map` instances (`services/securityStore.js`) bounded to 10,000 entries with automatic expired entry pruning.

### Consequences
- **Positive**:
  - Zero external infrastructure dependency: No Redis or external cache server required for local development or simple deployments.
  - Ultra-low latency memory lookups without network overhead.
- **Negative / Trade-offs**:
  - State is process-local: Restarting the Node.js process resets rate-limit counters.
  - In a clustered multi-instance deployment (e.g. multi-pod Kubernetes), rate limits are not shared across pods unless an external store is introduced.

---

## ADR 004: Two-Tier Cryptographic Aadhaar Protection

### Context
Indian statutory requirements mandate that citizen Aadhaar numbers must not be stored in plaintext. However, the system requires exact duplicate detection and verification.

### Decision
Implement a two-tier cryptographic model:
1. **Blind Index Lookup (`aadhaar_lookup`)**: Computed as `HMAC-SHA256(aadhaar_digits, AADHAAR_PEPPER)`. Allows exact deterministic $O(1)$ database lookup without storing the number.
2. **Permanent Storage Hash (`aadhaar_hash`)**: Irreversible `bcrypt` hash used for verification.

### Consequences
- **Positive**:
  - Plaintext Aadhaar is never persisted in MySQL or MongoDB logs.
  - Even if the database is leaked, raw Aadhaar numbers cannot be reversed without the isolated server-side `AADHAAR_PEPPER`.
- **Negative / Trade-offs**:
  - If the `AADHAAR_PEPPER` environment variable is lost or modified, existing `aadhaar_lookup` records become orphaned and unmatchable.

---

## ADR 005: 7-Day Delayed Effective Date for Mandi Configurations

### Context
Farmers can book procurement appointments up to 7 days into the future based on existing mandi operating hours, working days, and counter average service times. Immediate updates would disrupt or invalidate already confirmed appointments.

### Decision
When mandi working days, hours, or counter average service times are updated, changes are stored with an `effective_date = CURDATE() + INTERVAL 7 DAY`. The system continues serving appointments using current parameters until the effective date arrives.

### Consequences
- **Positive**:
  - Protects farmer appointments from unexpected cancellations or capacity conflicts.
  - Gives market yard staff and farmers 7 days of operational predictability.
- **Negative / Trade-offs**:
  - Mandi managers cannot make instant emergency schedule changes without database-level intervention.
