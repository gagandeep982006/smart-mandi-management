# Strengths & Technical Limitations

An honest, objective evaluation of the platform's architectural strengths, operational trade-offs, and technical limitations.

---

## 1. System Strengths

1. **Robust Relational Constraints**:
   - The schema strictly enforces `ON DELETE RESTRICT` across financial and operational entities, preventing orphaned payments or broken queue states.
2. **Two-Tier Aadhaar Protection**:
   - Implements HMAC-SHA256 blind indexing with `AADHAAR_PEPPER` + bcrypt permanent storage hashing, satisfying statutory Indian privacy mandates without requiring third-party token vaults.
3. **Primary–Secondary Read/Write Splitting**:
   - Connection pools automatically distribute analytical read load to available replicas while routing mutations and locks to the Primary database.
4. **Isolated Portal Sessions**:
   - Dedicated cookie names (`gov_token`, `mandi_token`, `farmer_token`, `payment_token`) prevent cross-portal token collisions on `localhost` or shared parent domains.
5. **Zero-Dependency In-Memory Rate Limiting**:
   - Process-local Map-based rate limiter provides abuse protection without requiring external cache infrastructure (such as Redis) for local operation.

---

## 2. Technical Limitations & Trade-offs

1. **Process-Local Rate Limiting (`Map`)**:
   - In-memory `Map` counters are local to each Node.js process. Restarting the backend resets rate limits, and multi-instance container deployments (e.g. Kubernetes) maintain independent rate-limiting buckets rather than a shared global rate limit.
2. **Shared Database Coordination**:
   - All four portal backends connect directly to the same MySQL database (`farmer_db`). Any breaking schema migration (such as dropping or renaming a column) requires coordinated updates across all portals.
3. **Simulated Payment Gateways**:
   - The Payment Portal handles status state transitions, transaction reference numbers (UTR), and receipt screenshot uploads, but does not execute direct automated banking API calls (e.g. live NPCI/NACH/PFMS integration). Bank disbursements are executed by officers and confirmed with transaction evidence.
4. **Replication Lag Sensitivity**:
   - If MySQL replication experiences significant asynchronous lag, reading immediately from a Secondary database after writing to the Primary could yield stale data if not queried inside a transaction.
