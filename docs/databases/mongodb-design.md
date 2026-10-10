# MongoDB Design & History Collections

The platform uses MongoDB (`farmer_history`) to capture non-blocking operational events, historical audit logs, and compliance records that do not require relational foreign key constraints.

---

## 1. Document Collections Inventory

| Collection / Model | Used In | Purpose | Retention / TTL |
|---|---|---|---|
| `PaymentLog` | Payment Portal | Audit record of payment state transitions, operator IDs, UTRs, and notes | Indexed TTL: `PAYMENT_LOG_RETENTION_YEARS` (default 5 years) |
| `BookingHistory` | Farmer & Mandi | Snapshot of appointment bookings across lifecycle states | Purged via scheduler: `TRANSACTION_HISTORY_RETENTION_DAYS` (30 days) |
| `TokenHistory` | Farmer & Mandi | Sequence snapshots of token call, arrival, and completion timestamps | Purged via scheduler: `TRANSACTION_HISTORY_RETENTION_DAYS` (30 days) |
| `PaymentHistory` | Farmer & Mandi | Operational history copy of sale generation events | Purged via scheduler: `TRANSACTION_HISTORY_RETENTION_DAYS` (30 days) |
| `MandiRecentLogs` | Mandi Portal | Real-time recent event stream displayed on Mandi supervisor dashboard | Cleaned via scheduler: `RECENT_LOG_RETENTION_DAYS` (7 days) |
| `LoginLogs` | Government & Mandi | Audit trail of successful and failed authentication attempts with IPs | Retained for administrative security review |
| `FarmerHistory` | Government Portal | Administrative records of deleted or mutated farmer records | Permanent administrative archive |

---

## 2. Sample Document Schema: `PaymentLog`

```javascript
// models/PaymentLog.js (Payment Portal)
const PaymentLogSchema = new mongoose.Schema({
    payment_id: { type: Number, required: true, index: true },
    booking_id: { type: Number, required: true },
    farmer_id: { type: Number, required: true, index: true },
    state_id: { type: Number, required: true, index: true },
    previous_status: { type: String, required: true },
    new_status: { type: String, required: true },
    action_type: { type: String, required: true }, // e.g. "STATUS_CHANGE", "DISBURSEMENT"
    operator_id: { type: Number, required: true },
    operator_username: { type: String, required: true },
    transaction_reference: { type: String, default: null },
    notes: { type: String, default: "" },
    ip_address: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, expires: `${retentionYears * 365}d` }
});
```

---

## 3. Scheduled Background Cleanups

In `mandi portel/backend/services/historyCleanupService.js`, a scheduled timer runs daily to clean up expired operational history from MongoDB without locking relational MySQL tables:

```javascript
// History Cleanup Service Example
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - transactionHistoryRetentionDays);

await BookingHistory.deleteMany({ createdAt: { $lt: cutoffDate } });
await TokenHistory.deleteMany({ createdAt: { $lt: cutoffDate } });
await PaymentHistory.deleteMany({ createdAt: { $lt: cutoffDate } });
```
