# Database Initialization & Schema Bootstrap

This guide explains how to initialize the relational MySQL database (`farmer_db`) and prepare the MongoDB document store (`farmer_history`).

---

## 1. MySQL Schema Bootstrap Order

The MySQL database schema contains table definitions, foreign keys, views, scheduled events, and trigger definitions.

The authoritative, dependency-ordered schema file is located at:
`mandi portel/backend/database/schema.sql` (also duplicated identically across portals).

### Step 1: Create Database
Connect to your local MySQL CLI as `root` (or administrative user):
```sql
CREATE DATABASE IF NOT EXISTS `farmer_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_0900_ai_ci;
```

### Step 2: Import the Schema File
Import `schema.sql` using the MySQL client command line:

```bash
# Windows PowerShell:
mysql -u root -p farmer_db < "d:\SIH\New folder\mandi portel\backend\database\schema.sql"

# Linux / macOS:
mysql -u root -p farmer_db < "./mandi portel/backend/database/schema.sql"
```

The schema file automatically:
1. Disables foreign key checks temporarily during bulk creation (`SET FOREIGN_KEY_CHECKS = 0;`).
2. Creates parent tables before child tables in dependency order:
   - `state` &rarr; `district` &rarr; `tehsil` &rarr; `crop`
   - `mandi` &rarr; `mandi_timing` &rarr; `mandi_working_day` &rarr; `mandi_counter`
   - `counter_avg_time` &rarr; `counter_service_time`
   - `procurement_session` &rarr; `procurement_quota`
   - `farmer` &rarr; `bank_account` &rarr; `farmer_land`
   - `booking` &rarr; `queue_token`
   - `app_users` &rarr; `userdetails` &rarr; `gov_login_otp`
   - `mandi_users` &rarr; `mandiuserdetails` &rarr; `mandi_user_counters` &rarr; `mandi_login_otp`
   - `payment_users` &rarr; `paymentuserdetails` &rarr; `payment_login_otp`
   - `payment` &rarr; `payment_completion_proof`
3. Re-enables foreign key checks (`SET FOREIGN_KEY_CHECKS = 1;`).
4. Creates MySQL views (`vw_mandis`, `vw_mandi_counters`, `vw_booking_queue`, `vw_completed_farmers`, `vw_payment_details`, etc.).
5. Creates events (`delete_expired_gov_otps`, `delete_expired_mandi_otps`).
6. Creates triggers (`prevent_direct_delete_userdetails`, `prevent_direct_delete_mandiuserdetails`, `prevent_direct_delete_paymentuserdetails`).

---

## 2. Programmatic Table Verification on Startup

Each portal backend includes auto-initialization verification on boot:
- **Government Backend**: `backend/index.js` invokes model initializers (`initDb()`) ensuring geographic and user tables exist.
- **Mandi Backend**: `backend/server.js` invokes `services/databaseInitializer.js` verifying mandi and counter tables.
- **Payment Backend**: `backend/server.js` invokes `services/databaseInitializer.js` creating `payment`, `payment_completion_proof`, `payment_users`, and `paymentuserdetails` if missing.
- **Farmer Backend**: `backend/index.js` runs `initFarmerDb.js` and `otp_table.js`.

---

## 3. MongoDB Initialization

MongoDB does not require upfront static schema creation. When portal backends boot:
1. `connectMongoDB()` or Mongoose connects to `MONGO_URI`.
2. Collections (`BookingHistory`, `TokenHistory`, `PaymentHistory`, `PaymentLog`, `LoginLogs`) and their respective indexes (such as TTL expiration indexes) are automatically initialized by Mongoose upon first write.
