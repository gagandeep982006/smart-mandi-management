# Farmer Portal Backend

The Farmer Portal backend provides authenticated self-service operations for registered farmers, including appointment booking, slot management, queue token tracking, and quota utilization.

> [!IMPORTANT]
> **Database Deletion Dependencies**: Bookings and payments enforce strict foreign key constraints (`ON DELETE RESTRICT`). To delete bookings or farmer profiles safely, refer to **[DATABASE_DELETION_GUIDE.md](../../DATABASE_DELETION_GUIDE.md)**.

---

## 1. Environment Configuration

Configured in `backend/.env` (sample template in `backend/.env.example`):

```env
# Server Configuration
PORT=5003
NODE_ENV=development

# MySQL Databases (Primary Write + Secondary Read Replicas)
PRIMARY_DB_HOST=localhost
PRIMARY_DB_USER=root
PRIMARY_DB_PASSWORD=your_mysql_password
PRIMARY_DB_NAME=farmer_db
PRIMARY_DB_PORT=3306

SECONDARY_DB_HOST=localhost
SECONDARY_DB_USER=root
SECONDARY_DB_PASSWORD=your_mysql_password
SECONDARY_DB_NAME=farmer_db
SECONDARY_DB_PORT=3306

# MongoDB Connection
MONGO_URI=mongodb://127.0.0.1:27017/farmer_history

# JWT & Identity Security
JWT_SECRET=your_jwt_secret_key
AADHAAR_PEPPER=your_isolated_high_entropy_aadhaar_pepper_secret

# OTP Abuse Protection & Login Rate Limiting (Server-Side In-Memory Map)
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_LOCKOUT_HOURS=2
OTP_RESEND_COOLDOWN_MINUTES=5
```

---

## 2. Server-Side In-Memory Security Store (`services/securityStore.js`)

Login and OTP abuse prevention is managed via a dedicated server-side in-memory JavaScript `Map` store:

- **Startup Validation**: Application boot validates that `LOGIN_MAX_FAILED_ATTEMPTS`, `LOGIN_LOCKOUT_HOURS`, and `OTP_RESEND_COOLDOWN_MINUTES` are configured and positive numbers. Missing or invalid settings fail fast safely.
- **5-Minute Resend Cooldown**: Subsequent OTP generation requests within 5 minutes (`OTP_RESEND_COOLDOWN_MINUTES`) are rejected immediately with HTTP 429 without hitting the database.
- **Lockout on Failed Verifications**: After `LOGIN_MAX_FAILED_ATTEMPTS` consecutive failed OTP verifications, the phone number is locked out for `LOGIN_LOCKOUT_HOURS` hours.
- **Generic Security Responses**:
  - Verification failures return HTTP 400: `"Unable to verify the OTP. Please check the code and try again."`
  - Lockout and cooldown triggers return HTTP 429: `"Too many requests. Please try again later."`
  - Thresholds, remaining attempt numbers, and lockout expiry times are never exposed to the client.
- **Memory Bounding & Privacy**:
  - Bounded to 10,000 entries with automatic expired entry pruning and FIFO/LRU eviction.
  - Keys are SHA-256 hashed so plaintext mobile numbers and IP addresses are not stored.
- **Security Boundaries**: Cookies never control rate-limiting decisions; clearing `farmer_token` does not reset server-side lockout counters. Successful authentication resets only the user's phone failure counter, preserving IP-level rate limits.
- **Known Limitation**: In-memory JavaScript `Map` is process-local. Counters are reset upon process restart, and multi-instance deployments maintain separate rate-limiting buckets per process.

---

## 3. Independent 30-Minute Booking Cancellation Security Rule

To prevent quota hoarding, rapid booking/cancellation cycling, and queue manipulation, the Farmer Portal backend strictly enforces a 30-minute minimum wait rule:

- **Backend Enforcement (`cancelBooking`)**:
  - In `cancelBooking`, the backend calculates `(Date.now() - new Date(booking.created_at).getTime()) / (60 * 1000)`.
  - If less than 30 minutes have elapsed since booking creation, the transaction is rolled back and the request is rejected with HTTP 400:
    `"Cancellation locked for security: X minute(s) remaining (minimum 30 minutes required after booking)"` along with `remaining_wait_minutes: X`.
- **Enriched Listing & Current Booking (`getBookings`, `getCurrentBooking`, `getDashboard`)**:
  - For bookings within 30 minutes of creation, `can_cancel` is set to `false`.
  - `lock_reason` is set to `"Cancellation locked for security: X minute(s) remaining (minimum 30 minutes required after booking)"`.
  - The UI displays the security lock notice until the 30-minute window has elapsed.
