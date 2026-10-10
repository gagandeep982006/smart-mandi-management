# Viva & Technical Interview Guide

This guide compiles anticipated questions and detailed, technically sound answers suitable for project evaluations, academic viva voce examinations, and senior engineering technical interviews.

---

## 1. System Architecture & Design Patterns

### Q1: Why did you divide the system into four separate portals instead of building a single large monolithic application?
**Answer**:
Dividing the platform into four portals (**Government**, **Mandi**, **Farmer**, and **Payment**) enforces strict separation of concerns, specialized user experiences, and independent security boundaries:
1. **Target Audiences Differ**: Farmers need simple, high-contrast mobile-friendly appointment scheduling; Mandi operators require rapid weighbridge queue screens; Payment officers need state-isolated financial ledgers; Government administrators require policy and user provisioning controls.
2. **Security & Session Isolation**: Dedicated cookie names (`gov_token`, `mandi_token`, `farmer_token`, `payment_token`) prevent session crosstalk.
3. **Independent Scalability**: During peak harvesting, the Farmer and Mandi portals experience massive concurrent load, while the Government portal remains relatively idle. Decoupled portals allow independent horizontal scaling.

---

### Q2: Why did you choose a Shared Database Integration Pattern rather than separate microservice databases communicating via REST or gRPC?
**Answer**:
1. **Transactional Integrity**: Financial disbursements, queue tokens, and bookings share critical relational constraints. In our domain, a payment cannot exist without a verified booking and completed weighbridge record. A shared database allows MySQL to enforce `ON DELETE RESTRICT` foreign keys directly without needing distributed transactions (2PC or sagas).
2. **Performance**: Complex queries (e.g. `vw_payment_details` joining payment, farmer, bank, land, mandi, and counter) execute via optimized database joins in milliseconds rather than requiring multiple inter-service HTTP hops.

---

## 2. Database Design & Replication

### Q3: How does your Primary–Secondary database routing work?
**Answer**:
Each backend service implements a database router (`databaserouter.js`):
- Write operations (`INSERT`, `UPDATE`, `DELETE`) and critical row locks (`SELECT ... FOR UPDATE`) are routed strictly to the `PRIMARY_DB` pool.
- Read queries (`SELECT`, views, searches) are routed to a candidate Secondary read replica (`SECONDARY1`, `SECONDARY2`, `SECONDARY3`) that has `STATUS=RUNNING`.
- The router randomly selects a candidate replica on startup to distribute load across replicas.
- If no secondary database is running, the router falls back safely to `PRIMARY_DB` for all queries.

---

### Q4: Why did you enforce `ON DELETE RESTRICT` on tables like `mandi_counter`, `booking`, and `payment`?
**Answer**:
In an enterprise procurement system handling public funds, accidental cascading deletions would be catastrophic:
- If a counter operator or admin deleted a `mandi_counter`, cascading would automatically delete historical bookings, tokens, and completed financial payments.
- `ON DELETE RESTRICT` ensures that MySQL explicitly blocks deletion if any child row references the parent.
- To safely delete an entity, records must be purged in reverse dependency order: `payment_completion_proof` &rarr; `payment` &rarr; `queue_token` &rarr; `booking` &rarr; `mandi_counter` (as detailed in our `DATABASE_DELETION_GUIDE.md`).

---

### Q5: What is the purpose of the triggers on the detail tables?
**Answer**:
Triggers `prevent_direct_delete_userdetails`, `prevent_direct_delete_mandiuserdetails`, and `prevent_direct_delete_paymentuserdetails` intercept direct SQL `DELETE` statements on profile tables and raise `SQLSTATE 45000`. This guarantees that user profile details can only be deleted when the parent user account (`app_users`, `mandi_users`, `payment_users`) is deleted via cascading, preserving account referential integrity.

---

## 3. Security & Cryptography

### Q6: How do you protect citizen Aadhaar numbers without violating privacy laws?
**Answer**:
We implement a two-tier cryptographic model:
1. **Blind Index Lookup (`aadhaar_lookup`)**: Computed using `HMAC-SHA256(aadhaar_digits, AADHAAR_PEPPER)`. This deterministic 64-character hex string allows $O(1)$ duplicate checking and lookup in MySQL without storing the plaintext number.
2. **Storage Hash (`aadhaar_hash`)**: Irreversible `bcrypt` hash used for secondary verification.
3. Raw 12-digit Aadhaar numbers are never written to disk, database tables, or logs.

---

### Q7: Why are you using HttpOnly cookies instead of storing JWTs in localStorage?
**Answer**:
Tokens stored in browser `localStorage` or `sessionStorage` are directly accessible to any JavaScript running on the page. If the application has an XSS vulnerability, malicious scripts can steal the token (`document.cookie` or `localStorage.getItem`).
`HttpOnly` cookies cannot be accessed or read by client-side JavaScript, protecting sessions against token theft. Setting `SameSite: "lax"` defends against CSRF attacks.

---

### Q8: How does your server-side rate limiting work, and why did you use an in-memory Map?
**Answer**:
- Implemented in `services/securityStore.js` using a bounded JavaScript `Map` (10,000 entries max) with automatic expired entry pruning.
- Phone numbers and IPs are hashed using SHA-256 before being stored as Map keys to protect privacy.
- It enforces a **5-minute cooldown** between successive OTP requests (`OTP_RESEND_COOLDOWN_MINUTES`) and a **2-hour lockout** after 5 consecutive failed attempts (`LOGIN_MAX_FAILED_ATTEMPTS`).
- We used an in-memory `Map` to provide zero-latency, zero-dependency rate limiting without requiring an external Redis server for standard deployments.

---

## 4. Business Logic & Procurement

### Q9: What is the "7-Day Delayed Effective Date" mechanism in the Mandi Portal?
**Answer**:
Farmers can book grain delivery appointments up to 7 days in advance based on the mandi's current operating hours, working days, and counter service times. If a mandi supervisor could change operating hours or declare a working day closed with immediate effect, existing farmer appointments would be invalidated or disrupted.
When changes are submitted, the new parameters are stored with `effective_date = CURDATE() + INTERVAL 7 DAY`. The system continues generating slots and serving appointments using the active schedule until the effective date arrives.
