# Mandi Portal Backend

A complete operational backend system built for Mandi staff and counter operators. Built with Node.js, Express, MySQL (mysql2 Primary-Secondary architecture), and MongoDB (Mongoose).

> [!IMPORTANT]
> **Database Deletion Hierarchy**: Deleting mandi operational entities (such as counters or bookings) is governed by strict foreign keys (`ON DELETE RESTRICT`). To delete counters, associated payments and bookings must be cleaned up first. See **[DATABASE_DELETION_GUIDE.md](../../DATABASE_DELETION_GUIDE.md)** for exact recipes.

---

## 1. Architectural Separation & Responsibilities

The system clearly distinguishes between administrative configuration and daily operational workflow:

| Responsibility | Government Portal | Mandi Portal | Farmer Portal (Future) |
|---|---|---|---|
| **Primary Role** | Administrative & Configuration | Daily Mandi Operations | Farmer Self-Service |
| **Users** | System Admins, State/District/Tehsil DBAs | Mandi Staff, Counter Operators | Farmers |
| **Mandi Setup** | Creates Mandis & counters, assigns crops, sets daily capacity | Reads Mandi & assigned counter configurations | Views nearby Mandis |
| **Mandi Timing** | - | Configures daily hours & weekly working days | Views operating hours |
| **User Management**| Creates Mandi users, assigns counters & permissions | **No user management APIs** (reads `mandi_users`) | - |
| **Queue Operations**| - | Calls farmers, marks arrival, processes, completes, reschedules | Receives tokens, views position |
| **Payments** | - | Automatically generates payment records on sale completion | Views payment status |
| **History** | Permanent records in MySQL | Temporary session history in MongoDB + permanent MySQL | Views booking history |

---

## 2. System Architecture

```text
                               ┌───────────────────────────────────┐
                               │         GOVERNMENT PORTAL         │
                               │  (Configures Mandis, Counters,   │
                               │   Sessions, Crops & Mandi Users)  │
                               └─────────────────┬─────────────────┘
                                                 │
                                                 ▼
                               ┌───────────────────────────────────┐
                               │           SHARED MYSQL            │
                               │  mandi, mandi_counter, crop,      │
                               │  procurement_session, mandi_users │
                               └─────────────────┬─────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
         ┌───────────────────┐                                       ┌───────────────────┐
         │   MANDI PORTAL    │                                       │   FARMER PORTAL   │
         │ (Daily Operations)│                                       │ (Future Bookings) │
         └─────────┬─────────┘                                       └───────────────────┘
                   │
         HttpOnly JWT Cookie
                   │
      ┌────────────┼────────────┐
      │            │            │
   user_id    permissions    mandi_id
                   │            │
            (read, write,   counter_ids
             update, delete)    │
                                ▼
                       Counter Authorization
                                │
               ┌────────────────┴────────────────┐
               │                                 │
             READ                              WRITE
               │                                 │
        Selected Secondary                  Primary DB
          (Chosen once at                        │
             startup)                    Transaction
                                                 │
               ┌─────────────────────────────────┴─────────────────┐
               ▼                                                   ▼
     Operational MySQL Tables                             MongoDB Collections
     - booking                                            - MandiLoginLogs (login tracking)
     - queue_token                                        - MandiRecentLogs (dashboard activity)
     - queue_token_history                                - BookingHistory (session lifecycle)
     - payment                                            - TokenHistory   (session lifecycle)
     - mandi_timing                                       - PaymentHistory (session lifecycle)
     - mandi_working_day
     - counter_service_time
```

---

## 3. Security & Authentication Architecture

### 3.1 HttpOnly JWT Authentication
- The JWT is stored **strictly** in an `HttpOnly` cookie named `token`.
- Tokens are **never** stored in `localStorage` or `sessionStorage`.
- Tokens are **never** returned in JSON response bodies or transmitted via `Authorization: Bearer` headers.
- All frontend calls include `credentials: "include"`.

### 3.2 JWT Payload
The token payload contains **only** essential authorization identifiers:
```json
{
  "user_id": 1001,
  "permissions": ["read", "write", "update", "delete"],
  "mandi_id": 1010,
  "counter_ids": [1012, 1013]
}
```
*Note: Passwords, password hashes, usernames, and roles are never stored in the token. Role verification (such as confirming `mandi_operator`) is performed dynamically via a Read DB query.*

### 3.3 Four-Permission System
Access control strictly enforces four core actions:
1. `read`
2. `write`
3. `update`
4. `delete`

Any non-standard permission string passed to `requirePermission(...)` is immediately rejected with HTTP `403 Forbidden`.

### 3.4 Mandi & Counter Authorization
Authorization is enforced using the authenticated token:
- Frontend values for `mandi_id` and `counter_ids` in `req.body`, `req.query`, or `req.params` are **never trusted**.
- Operations always bind to `req.user.mandi_id`.
- Access to counters requires `counter_id` to be present in `req.user.counter_ids`.
- **Counter Inactive Protection**: If `mandi_counter.status = 'inactive'`, the backend strictly disables all operational actions (calling, arriving, processing, completing, rescheduling).

---

## 4. Primary-Secondary Database Routing & Transactions

Configured in `services/databaserouter.js`:
- **Primary Database**: All writes (`INSERT`, `UPDATE`, `DELETE`) and transactions.
- **Secondary Databases**: 3 configured read replicas (`SECONDARY1`, `SECONDARY2`, `SECONDARY3`).
- **Persistent Startup Selection**:
  1. Inspects configured secondary databases.
  2. Identifies instances with status `RUNNING`.
  3. Randomly selects **one** secondary replica once at backend startup.
  4. Stores the selected replica in memory and reuses it for all subsequent reads.
  5. Falls back to Primary if no Secondary is available.

### Proper Pool Transaction Handling
```javascript
const pool = getWriteDatabase().promise();
const connection = await pool.getConnection();

try {
    await connection.beginTransaction();

    await connection.query("UPDATE ...", [...]);
    await connection.query("INSERT INTO ...", [...]);

    await connection.commit();
} catch (error) {
    await connection.rollback();
    throw error;
} finally {
    connection.release();
}
```

---

## 5. Token Lifecycle & Queue Operations

### 5.1 Status Progression
```text
Normal Workflow:
  BOOKED ──► WAITING ──► CALLED ──► ARRIVED ──► PROCESSING ──► COMPLETED (Payment Created)

No-Show & Reschedule Workflow:
  WAITING / CALLED ──► NOT_ARRIVED ──► RESCHEDULED ──► WAITING (New Date & Slot)
```

### 5.2 Concurrency-Safe Daily Capacity
Before rescheduling or creating bookings, the system acquires a connection on the Primary database, opens a transaction, locks the counter and usage records via `FOR UPDATE`, and ensures:
$$\sum (\text{Approved Quantity}) \le \text{Counter Daily Capacity}$$
If the limit would be exceeded, the transaction rolls back and returns HTTP `409 Conflict`.

### 5.3 Seven-Day Queue Window
Queue viewing and rescheduling are restricted to a **7-day window** (today + next 6 days). The backend validates this range.

---

## 6. Payment Lifecycle

When a farmer's sale is finalized:
1. The operator triggers `PATCH /api/tokens/:token_id/complete`.
2. A database transaction updates the token and booking to `COMPLETED`.
3. A `payment` record is created with:
   - `quantity_sold` = `booking.quantity_approved`
   - `rate_per_unit` = MSP rate (e.g. ₹2,200/quintal for Rice, ₹5,650 for Mustard)
   - `total_payable_amount` = `quantity_sold * rate_per_unit`
   - `payment_status` = `PENDING`
4. Duplicate payment creation is prevented by a unique constraint on `booking_id`.
5. Records are added to `queue_token_history` in MySQL, `PaymentHistory` in MongoDB, and `MandiRecentLogs`.

---

## 7. MongoDB Log Models vs. History Collections

| Collection | Purpose | Lifecycle / Retention |
|---|---|---|
| **`MandiLoginLogs`** | Operator login audit log | Permanent |
| **`MandiRecentLogs`** | Recent operational activities on the dashboard | Filtered & paginated on home page |
| **`BookingHistory`** | Temporary booking snapshot | Automatically deleted when procurement session expires |
| **`TokenHistory`** | Temporary queue snapshot | Automatically deleted when procurement session expires |
| **`PaymentHistory`** | Temporary payment snapshot | Automatically deleted when procurement session expires |

### Automatic Procurement Session Cleanup (`services/historyCleanupService.js`)
- Runs at startup and periodically every 1 hour.
- Identifies sessions where `procurement_session.end_date < CURDATE()`.
- Deletes MongoDB documents in `BookingHistory`, `TokenHistory`, and `PaymentHistory` matching `session_id`.
- **MySQL transactional data is never deleted.**

---

## 8. API Reference

### Authentication
- `POST /api/auth/login` - Authenticate with username & password; sets HttpOnly cookie.
- `POST /api/auth/logout` - Clear cookie.
- `GET /api/auth/me` - Get authenticated session payload from token.

### Mandi Operations
- `GET /api/mandi/me` - Mandi profile and authenticated user details.
- `GET /api/mandi/timing` - Operating hours.
- `PATCH /api/mandi/timing` - Update operating hours (requires `mandi_operator`).
- `GET /api/mandi/working-days` - Weekly working days schedule.
- `PATCH /api/mandi/working-days` - Update working schedule (requires `mandi_operator`).
- `GET /api/recent-logs?page=1&count=10` - Paginated recent activities for the logged-in user.

### Counters & Queue
- `GET /api/counters/my` - Assigned counters with capacity and live queue stats.
- `GET /api/counters/:counter_id` - Detailed counter profile.
- `GET /api/counters/:counter_id/summary` - Today's counter summary.
- `GET /api/counters/:counter_id/queue?date=YYYY-MM-DD` - Date-wise queue (7-day window).
- `POST /api/counters/:counter_id/call-next` - Call next waiting farmer.
- `PATCH /api/tokens/:token_id/arrive` - Mark farmer arrived.
- `PATCH /api/tokens/:token_id/start-processing` - Start weighing/quality verification.
- `PATCH /api/tokens/:token_id/complete` - Finalize sale and create payment.
- `PATCH /api/tokens/:token_id/not-arrived` - Mark farmer as no-show.
- `PATCH /api/tokens/:token_id/reschedule` - Reschedule token to future date & slot.

### Completed Records & Payments
- `GET /api/counters/:counter_id/completed` - Completed farmers within `COMPLETED_RETENTION_DAYS`.
- `GET /api/counters/:counter_id/payments` - Payments for bookings at this counter.
- `GET /api/payments/:payment_id` - Detailed payment record.

### Health
- `GET /health` - Server health status.

---

## 9. Automatic Database Initialization & MySQL Views

### 9.1 Automatic Initialization on Startup (`services/databaseInitializer.js`)
The Mandi Portal backend features **fully automated database initialization** executed on the Primary MySQL database before Express begins accepting requests:
1. **7 Operational Tables**: Created using `CREATE TABLE IF NOT EXISTS`:
   - `mandi_timing`
   - `mandi_working_day`
   - `counter_service_time`
   - `booking`
   - `queue_token`
   - `queue_token_history`
   - `payment`
2. **Performance Indexes**: Idempotently verified against `information_schema.statistics` before creation (no duplicate index errors).
3. **Optimized MySQL Views**: Created/updated using `CREATE OR REPLACE VIEW`:
   - `vw_mandi_counter_details` (Joins `mandi_counter`, `crop`, `counter_service_time`)
   - `vw_booking_queue` (Joins `queue_token`, `booking`, `farmer`, `crop`)
   - `vw_completed_farmers` (Joins `queue_token`, `booking`, `farmer`, `crop`, `payment` where status is `COMPLETED`)
   - `vw_payment_details` (Joins `payment`, `booking`, `farmer`, `crop`, `mandi`)
4. **Safety Guarantees**:
   - Zero data loss: Never drops or truncates tables, never modifies existing records.
   - Government Portal tables (`mandi`, `mandi_counter`, `crop`, `mandi_users`, `procurement_session`, etc.) are **never** altered or re-created.
   - Server fails fast and halts if database initialization encounters any unrecoverable error.
   - Express only starts listening on port 5001 once initialization finishes successfully.

### 9.2 Optional Demo Seed Data
Demo seed records are located in:
- `../database/seed/mandi_demo_data.sql`

*Demo data is never inserted automatically at startup, keeping development and production data clean.*

### 9.3 Demo Credentials
- **Username**: `operator1`
- **Password**: `operator123`
- **Role**: `mandi_operator`
- **Mandi ID**: `1010` (New Atle Mandi10)
- **Assigned Counters**: `1012` (c1, Rice) and `1013` (c2, Maize)

---

## 10. How to Run the Project

### Prerequisites
- Node.js (v18+ recommended)
- MySQL 8.x running with database `farmer_db`
- MongoDB running on `mongodb://127.0.0.1:27017/farmer_history`

### Option A: Run Both Backend & Frontend Simultaneously (From Root Directory)
From the root folder (`mandi portel`), execute:
```powershell
npm run both
```
This uses `concurrently` to start:
- **Backend**: `http://localhost:5001` (Nodemon dev server + automatic DB initialization)
- **Frontend**: `http://localhost:3000` (Vite dev server with `/api` proxy to 5001)

### Option B: Run Backend Individually
```powershell
cd backend
npm run dev
```

---

## 11. OTP Abuse Protection & In-Memory Rate Limiting

The Mandi Portal backend enforces login and OTP abuse protection using a server-side in-memory JavaScript `Map` store (`services/securityStore.js`):

### Configurable Security Settings (`.env`)
```env
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_LOCKOUT_HOURS=2
OTP_RESEND_COOLDOWN_MINUTES=5
```
- **Startup Validation**: Validates at application boot that `LOGIN_MAX_FAILED_ATTEMPTS`, `LOGIN_LOCKOUT_HOURS`, and `OTP_RESEND_COOLDOWN_MINUTES` exist and are valid positive numbers.
- **5-Minute Resend Cooldown**: Subsequent OTP requests within 5 minutes are rejected immediately with HTTP 429 without database lookups.
- **Lockout Mechanism**: When failed verification attempts reach `LOGIN_MAX_FAILED_ATTEMPTS`, the phone number is locked out for `LOGIN_LOCKOUT_HOURS` hours.
- **Generic Security Responses**:
  - Verification failures return HTTP 400: `"Unable to verify the OTP. Please check the code and try again."`
  - Lockout and cooldown triggers return HTTP 429: `"Too many requests. Please try again later."`
  - Thresholds, remaining attempts, and lockout expiry times are never disclosed to users.
- **Memory Bounding & Eviction**:
  - Maximum 10,000 entries with automatic purge of expired items and FIFO/LRU eviction.
  - Keys are SHA-256 hashed to avoid storing plaintext phone numbers or IPs.
- **Security Boundaries**: Cookies never dictate security state. Clearing browser cookies does not reset server rate limits. Successful authentication resets only the user's phone failure counter, never IP rate limits.
- **Known Limitation**: In-memory JavaScript `Map` is process-local. Backend restarts clear active counters, and multi-instance deployments maintain separate rate-limiting buckets per process.
