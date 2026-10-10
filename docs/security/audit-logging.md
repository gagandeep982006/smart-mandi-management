# Audit Logging & Compliance

Comprehensive, tamper-evident audit trails are critical for public procurement oversight, anti-corruption compliance, and post-harvest financial audits.

---

## 1. Audit Logging Architecture

Audit logging is divided cleanly between relational transactions and non-blocking document storage:
1. **Financial & Operational State in MySQL**:
   - Every mutation records timestamps (`created_at`, `updated_at`).
   - Payment rows store `generated_by_user_id` referencing the mandi operator who processed the sale.
   - Proof records (`payment_completion_proof`) store `operator_id`, `transaction_reference`, and bank receipts.
2. **Audit & Event Stream in MongoDB**:
   - `PaymentLog`: Captures every lifecycle status transition with operator IDs, client IP addresses, previous vs new statuses, and operator notes.
   - `LoginLogs`: Logs all authentication requests (success and failure) with hashed phone numbers, IP addresses, and timestamps.
   - `FarmerHistory` / `MandiHistory`: Archives deleted entities for forensic recovery.

---

## 2. Non-Blocking Async Logging Pattern

To prevent logging from degrading the latency of transactional APIs, MongoDB writes execute asynchronously without blocking the client response:

```javascript
// services/auditLogService.js (Payment Portal)
async function recordPaymentAudit({ paymentId, farmerId, stateId, oldStatus, newStatus, user, notes, ip }) {
    try {
        // Fire-and-forget or non-blocking promise
        PaymentLog.create({
            payment_id: paymentId,
            farmer_id: farmerId,
            state_id: stateId,
            previous_status: oldStatus,
            new_status: newStatus,
            action_type: "STATUS_TRANSITION",
            operator_id: user.user_id,
            operator_username: user.username,
            notes: notes || "",
            ip_address: ip
        }).catch(err => console.error("[AuditLog Error]:", err.message));
    } catch (err) {
        console.error("[AuditLog Exception]:", err.message);
    }
}
```

---

## 3. Compliance Retention & TTL Policies

- **Statutory Retention**: Government accounting guidelines typically require financial records to be retained for 5 to 7 years.
- **Automated MongoDB TTL Indexes**:
  ```javascript
  // Indexed TTL automatically purges records after PAYMENT_LOG_RETENTION_YEARS
  PaymentLogSchema.index(
      { createdAt: 1 }, 
      { expireAfterSeconds: retentionYears * 365 * 24 * 60 * 60 }
  );
  ```
- **MySQL Permanent Retention**: MySQL tables (`payment`, `booking`, `farmer`) are never purged automatically by TTL and can only be cleaned according to scheduled administrative retention policies (`FARMER_PROCUREMENT_HISTORY_RETENTION_YEARS`).
